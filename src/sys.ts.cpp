#include <fstream>
#include <streambuf>
#include <iostream>

namespace SYS {
  int fileExists(std::string filename) {
    std::ifstream t(filename);
    return t.good();
  }

  std::string fileRead(std::string filename) {
    std::ifstream t(filename);
    if (!t.good()) {
      std::cout << "Error opening file: " << filename << std::endl;
    }
    std::string str((std::istreambuf_iterator<char>(t)), std::istreambuf_iterator<char>());
    return str;
  }

  void exit(int result) {
    ::exit(result);
  }
}