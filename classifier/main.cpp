// main.cpp
#include <aws/core/Aws.h>
#include <aws/core/utils/logging/LogLevel.h>
#include <aws/core/utils/logging/ConsoleLogSystem.h>
#include <aws/core/utils/logging/LogMacros.h>
#include <aws/core/utils/json/JsonSerializer.h>
#include <aws/core/utils/HashingUtils.h>
#include <aws/core/platform/Environment.h>
#include <aws/core/client/ClientConfiguration.h>
#include <aws/core/auth/AWSCredentialsProvider.h>
#include <aws/s3/S3Client.h>
#include <aws/s3/model/GetObjectRequest.h>
#include <aws/lambda-runtime/runtime.h>

#include <iostream>
#include <memory>
#include <fstream>
#include <sstream>
#include <iostream>
#include <unistd.h>

#include <opencv2/core.hpp>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/dnn.hpp>

char const TAG[] = "Classifier";
using namespace cv;
using namespace dnn;

std::string downloadFile(
    Aws::S3::S3Client const& client,
    Aws::String const& bucket,
    Aws::String const& key,
    Aws::Vector<uchar> &buffer)
{
    AWS_LOGSTREAM_INFO(TAG, "Attempting to download file from s3://" << bucket << "/" << key);
    Aws::S3::Model::GetObjectRequest request;
    request.WithBucket(bucket).WithKey(key);

    auto outcome = client.GetObject(request);
    if (outcome.IsSuccess()) {
        AWS_LOGSTREAM_INFO(TAG, "Download success: "<< key);
        auto& stream = outcome.GetResult().GetBody();
        buffer.reserve(stream.tellp());
        stream.seekg(0, stream.beg);

        char streamBuffer[1024 * 4];
        while (stream.good()) {
            stream.read(streamBuffer, sizeof(streamBuffer));
            auto bytesRead = stream.gcount();

            if (bytesRead > 0) {
                buffer.insert(buffer.end(), (uchar*)streamBuffer, (uchar*)streamBuffer + bytesRead);
            }
        }
        return {};
    }
    else {
        AWS_LOGSTREAM_ERROR(TAG, "Failed with error: " << outcome.GetError());
        return outcome.GetError().GetMessage();
    }
}
void loadClasses(std::vector<std::string> &classes)
{
    std::ifstream ifs("classification_classes_ILSVRC2012.txt");
    if (!ifs.is_open())
    {
        AWS_LOGSTREAM_ERROR(TAG, "Error loading classes");
        return;
    }
    std::string line;
    while (std::getline(ifs, line))
    {
        classes.push_back(line);
    }
}
bool readFile(const char *filename, std::vector<uchar> &buffer)
{
    std::ifstream file(filename, std::ios::in | std::ios::binary | std::ios::ate);
    if (file.is_open())
    {
        std::streampos size = file.tellg();
        buffer.resize(size);
        file.seekg(0, std::ios::beg);
        uchar *target = &buffer[0];
        file.read((char*)target, size);
        file.close();
        return true;
    }
    return false;
}

int getClassId(Aws::Vector<uchar> &img_buffer, double &inference_time, double &confidence, Net &net)
{
    cv::Mat blob;
    cv::Mat rawData( 1, img_buffer.size(), CV_8UC1, (void*)&img_buffer[0]);
	cv::Mat image = cv::imdecode( rawData, 1 );
    // config for GoogLeNet:
    cv::Scalar mean(104.0, 117.0, 123.0);
	blobFromImage(image, blob, 1.0, Size(224, 224), mean, false, false);
	//! [Set input blob]
	net.setInput(blob);
	//! [Set input blob]
	//! [Make forward pass]
	cv::Mat prob = net.forward();
	//! [Make forward pass]

	//! [Get a class with a highest score]
	cv::Point classIdPoint;
	minMaxLoc(prob.reshape(1, 1), 0, &confidence, 0, &classIdPoint);
	int classId = classIdPoint.x;
	//! [Get a class with a highest score]

	// Put efficiency information.
	std::vector<double> layersTimes;
	double freq = getTickFrequency() / 1000;
	inference_time = net.getPerfProfile(layersTimes) / freq;
    return classId;
}

std::function<std::shared_ptr<Aws::Utils::Logging::LogSystemInterface>()> GetConsoleLoggerFactory()
{
    return [] {
        return Aws::MakeShared<Aws::Utils::Logging::ConsoleLogSystem>(
            "console_logger", Aws::Utils::Logging::LogLevel::Debug);
    };
}
using namespace aws::lambda_runtime;
static invocation_response my_handler(
    invocation_request const& req,
    Aws::S3::S3Client const& client,
    const Aws::String &bucket,
    Net &net, 
    std::vector<std::string> &classes)
{
    std::cout<<"request "<<req.payload<<std::endl;
    using namespace Aws::Utils::Json;
    JsonValue json(req.payload);
    if (!json.WasParseSuccessful()) {
        return invocation_response::failure("Failed to parse input JSON", "InvalidJSON");
    }

    auto v = json.View();

    if (!v.ValueExists("key") || !v.GetObject("key").IsString()) {
        return invocation_response::failure("Missing input value 'key'", "InvalidJSON");
    }

    auto key = v.GetString("key");

    AWS_LOGSTREAM_INFO(TAG, "Attempting to download file from s3://" << bucket << "/" << key);
    Aws::Vector<uchar> buffer;
    auto err = downloadFile(client, bucket, key, buffer);

    if (!err.empty()) {
        return invocation_response::failure(err, "DownloadFailure");
    }
    std::cout<<"download success "<<buffer.size()<<" bytes"<<std::endl;
    
    double inference_time=0;
    double confidence=0;
    int classId = getClassId(buffer, inference_time, confidence, net);
    std::string label;
    if ((unsigned int)classId>=classes.size()) label = format("Class #%d", classId);
    else label = classes[classId];
    std::string logline = format("Inference result: '%s' confidence %.4f in %.4fms",
            label.c_str(),
            confidence, inference_time);
	std::cout << logline << std::endl;
    Aws::String result = format("{ \"label\": \"%s\" }", label.c_str());
    return invocation_response::success(result, "text/json");
}

int main(int argc, char **argv)
{
    char temp[255];
    temp[0]=0;
    getcwd(temp, sizeof(temp));
    const char *arg0="<none>";
    if (argc>0) arg0=argv[0];
    std::cout<<"Starting in "<<temp<<" as "<<arg0<<std::endl;

    double start_t = (double)cv::getTickCount();
    using namespace Aws;
    SDKOptions options;
    //options.loggingOptions.logLevel = Aws::Utils::Logging::LogLevel::Debug;
    //options.loggingOptions.logger_create_fn = GetConsoleLoggerFactory();
    InitAPI(options);
    double t = (double)cv::getTickCount();
    std::cout<<"InitAPI in "<<((t-start_t) / cv::getTickFrequency())*1000<<"ms"<<std::endl;
    start_t=t;
    {
        std::vector<std::string> classes;
        loadClasses(classes);
        Client::ClientConfiguration client_config;
        client_config.region = Aws::Environment::GetEnv("AWS_REGION");
        client_config.caFile = "/etc/pki/tls/certs/ca-bundle.crt";
        auto credentialsProvider = Aws::MakeShared<Aws::Auth::EnvironmentAWSCredentialsProvider>(TAG);
        S3::S3Client client(credentialsProvider, client_config);
        Aws::String bucket = Aws::Environment::GetEnv("IMAGES_S3_BUCKET");
        Aws::String dnn_bucket = Aws::Environment::GetEnv("DNN_S3_BUCKET");
        Aws::Vector<uchar> dnn_model;
        readFile("bvlc_googlenet.caffemodel", dnn_model);
        if (dnn_model.empty())
        {
            auto err = downloadFile(client, dnn_bucket, "bvlc_googlenet.caffemodel", dnn_model);
            if (!err.empty())
            {
                AWS_LOGSTREAM_ERROR(TAG, "Unable to download weights: " << err);
            }
            t = (double)cv::getTickCount();
            std::cout<<"Model downloaded in "<<((t-start_t) / cv::getTickFrequency())*1000<<"ms"<<std::endl;
            start_t=t;
        } else
        {
            t = (double)cv::getTickCount();
            std::cout<<"Model read from file in "<<((t-start_t) / cv::getTickFrequency())*1000<<"ms"<<std::endl;
            start_t=t;
        }
        Aws::Vector<uchar> dnn_config;
        readFile("bvlc_googlenet.prototxt", dnn_config);
        Net net = readNetFromCaffe(dnn_config, dnn_model);

        // test: 
        /*Aws::Vector<uchar> test_img;
        readFile("test_img.jpg", test_img);
        double inference_time, confidence;
        int classId = getClassId(test_img, inference_time, confidence, net);
        std::string label = format("%s: %.4f in %.4fms",
            ((unsigned int)classId>=classes.size() ? format("Class #%d", classId).c_str() : classes[classId].c_str()),
            confidence, inference_time);
	    std::cout << label << std::endl;*/

        auto handler_fn = [&client, &bucket, &net, &classes](aws::lambda_runtime::invocation_request const& req) {
            return my_handler(req, client, bucket, net, classes);
        };
        run_handler(handler_fn);
    }
    ShutdownAPI(options);
    return 0;
}
