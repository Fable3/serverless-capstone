FROM amazonlinux:2018.03
WORKDIR /tmp
RUN yum install -y gcc64-c++ libcurl-devel git zip
RUN yum install -y wget
RUN wget -O cmake-install https://github.com/Kitware/CMake/releases/download/v3.13.0/cmake-3.13.0-Linux-x86_64.sh
RUN sh cmake-install --skip-license --prefix=/usr --exclude-subdirectory

RUN git clone https://github.com/awslabs/aws-lambda-cpp.git
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

CMD ["/bin/bash"]

