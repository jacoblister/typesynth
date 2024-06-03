ifeq ($(OS),Windows_NT)
EXECMAIN=echo SYS.execmain(main); >> build/cmd.js
UNX=..\unx\\
CPP = cl /EHsc /std:c++17
CC = cl /EHsc
WAXCPP = build\waxcpp.exe
WAXC = build\waxc.exe
TMPBIN = tmp.exe
else
EXECMAIN=echo "SYS.execmain(main);" >> build/cmd.js
UNX=
CPP = g++ -std=c++17
CC = gcc
WAXCPP = build/waxcpp
WAXC = build/waxc
TMPBIN = ./tmp.bin
endif

all: build/wax.js build/waxjs.js $(WAXCPP) $(WAXC)

test: test_wax_js test_wax_cpp test_wax_c

clean:
	$(UNX)rm -f  build/* tmp.* *.obj *.o *.bin *.exe *.tmp

build/wax.js: *.ts
	tsc --outDir build --target esnext --lib esnext cmd.ts
	$(EXECMAIN)
	rollup build/cmd.js --file build/wax.js

build/waxjs.js: *.ts build/wax.js
	node build/wax.js build --target=js cmd.ts > build/waxjs.js

build/waxcpp.cpp: *.ts build/wax.js
	node build/wax.js build --target=cpp cmd.ts > build/waxcpp.cpp

$(WAXCPP): build/waxcpp.cpp 
	$(CPP) build/waxcpp.cpp -o build/waxcpp

build/waxc.c: *.ts build/wax.js
	node build/wax.js build --target=c cmd-minimal.ts > build/waxc.c

$(WAXC): build/waxc.c
	$(CC) build/waxc.c -o build/waxc

WAX_TEST = $(wildcard test/*.wax)
WAX_TEST_EXTENDED = $(wildcard test_extended/*.wax)

WAX_TEST_C = $(patsubst %.wax, %.test.c.out, $(WAX_TEST))
WAX_TEST_CPP = $(patsubst %.wax, %.test.cpp.out, $(WAX_TEST) $(WAX_TEST_EXTENDED))
WAX_TEST_JS = $(patsubst %.wax, %.test.js.out, $(WAX_TEST) $(WAX_TEST_EXTENDED))

%.test.js.out: %.wax
	node build/wax.js build --target=js $< > tmp.js && node tmp.js > out.tmp && $(UNX)diff $*.out out.tmp

%.test.cpp.out: %.wax
	$(WAXCPP) build --target=cpp $< > tmp.cpp && $(CPP) tmp.cpp -o $(TMPBIN) && $(TMPBIN) > out.tmp && $(UNX)diff $*.out out.tmp

%.test.c.out: %.wax
	$(WAXC) build --target=c $< > tmp.c && $(CC) tmp.c -o $(TMPBIN) && $(TMPBIN) > out.tmp && $(UNX)diff $*.out out.tmp

test_wax_js: build/wax.js $(WAX_TEST_JS)

test_wax_cpp: $(WAXCPP) $(WAX_TEST_CPP)

test_wax_c: $(WAXC) $(WAX_TEST_C)