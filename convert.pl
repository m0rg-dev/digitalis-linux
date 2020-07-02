while(<>) {
    s/export VERSION=(.*)$/version: "$1"/;
    s/PACKAGE=/filename: /;
    s/USE_BUILD_DIR=1/use_build_dir: true/;
    s/CONFIG_OPTS="--prefix=\/usr (.*)"/additional_configure_options: $1/;
    s/UPSTREAM="?(.*)"?$/upstream: $1%{filename}/;
    s/use_mod acmake//;
    print;
}