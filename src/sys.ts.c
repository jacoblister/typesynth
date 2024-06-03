#include <stdio.h>

char *SYS_readFile(char *filename) {
  FILE *f;
  if ((f = fopen(filename, "r"))) {
    fseek(f, 0, SEEK_END);
    int length = ftell(f);
    fseek (f, 0, SEEK_SET);
    char *buffer = calloc(length, sizeof(char));
    fread(buffer, 1, length, f);
    buffer[length] = 0;
    char *strBuffer = STRING_ALLOC(buffer);
    free(buffer);
    return strBuffer;
  } else {
    printf("Error opening file: %s", filename);
    exit(0);
  }
  return "";
}