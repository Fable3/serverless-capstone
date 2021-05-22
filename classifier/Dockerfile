FROM amazonlinux:2018.03
WORKDIR /tmp
RUN yum install -y gcc64-c++ libcurl-devel git zip
RUN yum install -y libcurl-devel openssl-devel libuuid-devel pulseaudio-libs-devel
RUN yum install -y wget
RUN wget -O cmake-install https://github.com/Kitware/CMake/releases/download/v3.13.0/cmake-3.13.0-Linux-x86_64.sh
RUN sh cmake-install --skip-license --prefix=/usr --exclude-subdirectory

RUN git clone https://github.com/awslabs/aws-lambda-cpp.git
RUN git clone --recurse-submodules https://github.com/aws/aws-sdk-cpp

WORKDIR /tmp/aws-lambda-cpp/build
RUN cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DCMAKE_INSTALL_PREFIX=/opt/local
RUN make install

RUN mkdir opencv
WORKDIR /tmp/opencv
RUN wget -O opencv.zip https://github.com/opencv/opencv/archive/master.zip
RUN yum install -y unzip
RUN unzip opencv.zip 
RUN mkdir build
WORKDIR /tmp/opencv/build
RUN cmake ../opencv-master/
RUN cmake --build .
RUN make install

WORKDIR /tmp/sdk_build
RUN cmake ../aws-sdk-cpp -DCMAKE_BUILD_TYPE=Release -DBUILD_ONLY=s3 -DBUILD_SHARED_LIBS=ON
RUN make install

CMD ["/bin/bash"]

