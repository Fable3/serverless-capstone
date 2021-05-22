# Serverless Capstone Project

My project demonstrates the capabilities of high-performance lambda functions. With C++ officially supported in AWS, it's possible to include lambda functions in the backend that are time consuming.

I'm re-using the Udagram project, which is a lightweight image sharing application, and will add a function to classify the uploaded images with a deep neural network using OpenCV.

## Creating C++ Lambda function

There was an article from 2018. November about "Introducing the C++ Lambda Runtime". The blog post can be read here: https://aws.amazon.com/blogs/compute/introducing-the-c-lambda-runtime/

Following the guide was not trivial, here's the steps for creating hello.zip:

First of all, we need Amazon Linux. Amazon can create EC2 instance, but to do it locally, I went to https://hub.docker.com/_/amazonlinux

The latest Linux-1 image was 2018.03, so I created a simple Dockerfile:

```dockerfile
FROM amazonlinux:2018.03
CMD ["/bin/bash"]
```



```
docker build -t amazon .
docker run -it amazon
```

In the docker image, following the guide (plus zip, which was missing)

```
yum install -y gcc64-c++ libcurl-devel
export CC=gcc64
export CXX=g++64
yum install -y cmake3
yum install -y git
yum install -y zip
```

However, cmake3 3.5 version is not enough, I later got the error message: `CMake 3.9 or higher is required.`

Based on this post: https://github.com/awslabs/aws-lambda-cpp/issues/109

```
yum install -y wget
wget -O cmake-install https://github.com/Kitware/CMake/releases/download/v3.13.0/cmake-3.13.0-Linux-x86_64.sh
sh cmake-install --skip-license --prefix=/usr --exclude-subdirectory

cd ~ 
git clone https://github.com/awslabs/aws-lambda-cpp.git
cd aws-lambda-cpp
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX=/opt/local
```

To build the hello world application:

```
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/opt/local
make
make aws-lambda-package-hello
```

The hello.zip was created, and continuing from Windows, I uploaded to AWS:

```
docker cp 3533318d01da:/tmp/hello-world/hello.zip .
aws iam create-role --role-name lambda-cpp-demo --assume-role-policy-document file://trust-policy.json
aws lambda create-function --function-name hello-world --role arn:aws:iam::447830847150:role/lambda-cpp-demo --runtime provided --timeout 15 --memory-size 128 --handler hello --zip-file fileb://hello.zip
aws lambda invoke --function-name hello-world --payload "{}" output.txt
```

The invoke was successful with status code 200, the output.txt contains "Hello Word"

The hello-world folder has the Dockerfile for building the image, it is a useful starting point for compiling basic C++ lambda function. To use it:

```
docker build -t aws_cpp .
docker run -it aws_cpp

bash-4.2# pwd
/tmp/hello-world/build

bash-4.2# ls -l
total 18896
-rw-r--r-- 1 root root    12582 May 22 05:49 CMakeCache.txt
drwxr-xr-x 1 root root     4096 May 22 05:49 CMakeFiles
-rw-r--r-- 1 root root     5215 May 22 05:49 Makefile
-rw-r--r-- 1 root root     1491 May 22 05:49 cmake_install.cmake
-rwxr-xr-x 1 root root    38312 May 22 05:49 hello
-rw-r--r-- 1 root root 19271364 May 22 05:49 hello.zip
```



## OpenCV

The guide to install is here: https://docs.opencv.org/master/d7/d9f/tutorial_linux_install.html

In my AWS Linux docker image:

```
mkdir opencv && cd opencv
wget -O opencv.zip https://github.com/opencv/opencv/archive/master.zip
yum install -y unzip
unzip opencv.zip 
mkdir build && cd build
cmake ../opencv-master/
cmake --build .
make install
```

The installation process takes about an hour, so this is a candidate for a new development Docker image.

The generated libraries are quite big, and there's a limit of 50 Mb of zip file for a lambda function, so a project should only include the used `.so` files in the final zip.

## Image Classification Test

To classify an image, I started with the sample code in openCV: https://github.com/opencv/opencv/tree/3.4/samples/dnn

Removed the GUI, VideoCapture, etc to get a commandline tool for classification.

I've chosen GoogLeNet for its relatively small model weight file size and good performance.

Tried out for 2 images:

```
bash-4.2# ./classification googlenet -i=dog2.jpg -m=bvlc_googlenet.caffemodel -c=bvlc_googlenet.prototxt -classes=classification_classes_ILSVRC2012.txt
Inference time: 27.50 ms
Border collie: 0.7920
bash-4.2# ./classification googlenet -i=dog3.jpg -m=bvlc_googlenet.caffemodel -c=bvlc_googlenet.prototxt -classes=classification_classes_ILSVRC2012.txt
Inference time: 30.71 ms
dalmatian, coach dog, carriage dog: 1.0000
```

Full process of a working OpenCV build:

- in opencv-dnn, either build the Docker image (takes about 1 hour), or pull it from DockerHub
- Run the image in interactive mode: docker run -it aws_cpp_opencv
- copy the files to the running environment: docker cp . 346c507ab859:/tmp

Then from the bash in Docker:

```
bash-4.2# make
bash-4.2# export LD_LIBRARY_PATH=/usr/local/lib64
bash-4.2# wget http://dl.caffe.berkeleyvision.org/bvlc_googlenet.caffemodel
bash-4.2# wget https://upload.wikimedia.org/wikipedia/commons/f/fa/Elephants_at_Amboseli_national_park_against_Mount_Kilimanjaro.jpg
bash-4.2# ./classification googlenet -classes=classification_classes_ILSVRC2012.txt -i=Elephants_at_Amboseli_national_park_against_Mount_Kilimanjaro.jpg
Inference time: 30.78 ms
African elephant, Loxodonta africana: 0.8207
```

## AWS C++ SDK

To download from S3 bucket, AWS SDK is needed.

Instructions: https://github.com/aws/aws-sdk-cpp/wiki/Building-the-SDK-from-source-on-EC2

Hello S3: https://docs.aws.amazon.com/sdk-for-cpp/v1/developer-guide/build-cmake.html

Some of the instructions were quite misleading, like missing the recurse flag from git command, here's a working version (for s3 only), running from a docker image with increased memory (`docker run -it --memory="4g" aws_cpp`):

```
yum install libcurl-devel openssl-devel libuuid-devel pulseaudio-libs-devel -y
git clone --recurse-submodules https://github.com/aws/aws-sdk-cpp
mkdir sdk_build
cd sdk_build
cmake ../aws-sdk-cpp -DCMAKE_BUILD_TYPE=Release -DBUILD_ONLY=s3 -DBUILD_SHARED_LIBS=ON
make install
```

Running Hello S3 did not require any changes, simply cmake and make, and copy the aws credentials to /root/.aws

Result:

```
bash-4.2# ./app
Found 4buckets
c4-final-images-033212455158-dev
elasticbeanstalk-us-east-2-447830847150
serverless-todo-app-dev-serverlessdeploymentbucke-qyefqouddt3h
udagram-447830847150-dev
```

Finally, all 3 libraries (AWS SDK, AWS Lambda Runtime, OpenCV) working together in a starter project with the following CMakeLists.txt:

```cmake
cmake_minimum_required(VERSION 3.3)
set(CMAKE_CXX_STANDARD 11)
project(classifier LANGUAGES CXX)

message(STATUS "CMAKE_PREFIX_PATH: ${CMAKE_PREFIX_PATH}")
set(BUILD_SHARED_LIBS ON CACHE STRING "Link to shared libraries by default.")

#Load required services/packages: This basic example uses S3.
find_package(AWSSDK REQUIRED COMPONENTS s3)
find_package(aws-lambda-runtime REQUIRED)
add_executable(${PROJECT_NAME} "main.cpp") #Add app's main starting file.

set_compiler_flags(${PROJECT_NAME})
set_compiler_warnings(${PROJECT_NAME})
include_directories(/opt/local/include)
include_directories(/usr/local/include/opencv4)
link_directories(/usr/local/lib/)
target_link_libraries(${PROJECT_NAME} PUBLIC
                      AWS::aws-lambda-runtime
					  opencv_core opencv_imgcodecs opencv_dnn
                       ${AWSSDK_LINK_LIBRARIES})

aws_lambda_package_target(${PROJECT_NAME})
```

From `build` folder, call `cmake .. -DCMAKE_PREFIX_PATH=/opt/local`

The `classifier.zip` with the not-yet-working lambda function was 45 megabytes, which is quite close to the 50 megabyte limit. The build log showed that opencv_imgproc was added, but earlier I tested that it was not needed: `adding: lib/libopencv_imgproc.so.4.5 (deflated 58%)`

Without that the zip file would be 32 megabytes.

## Implementation of classifier

Problems encountered and solutions:

- S3 name is global, but when using the C++ AWS SDK, the GetObject can return with a permanent redirect error. The SDK tries to put in the AWS_REGION, and it has to match with the region of creation. More here: https://aws.amazon.com/premiumsupport/knowledge-center/s3-http-307-response/
- AWS SDK logs a lot, it dumps the 50Mb GoogLeNet model on Debug level after fetching it from an S3 bucket (with CURL tag). I switched it off and used my own logs only.

To build the lambda function in its development Docker image:

```sh
mkdir build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH=/opt/local
make
make aws-lambda-package-classifier
```

