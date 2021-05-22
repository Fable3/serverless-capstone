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
