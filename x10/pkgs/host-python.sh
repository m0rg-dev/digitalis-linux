source ../lib.sh

export PACKAGE=host-python
export VERSION=3.9.0
INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "Python-${VERSION}" "9c73e63c99855709b9be0b3cc9e5b072cb60f37311e8c4e50f15576a0bf82854" \
        "https://www.python.org/ftp/python/${VERSION}/Python-${VERSION}.tar.xz"
    setup-build-dirs "Python-${VERSION}"
    build-autoconf "Python-${VERSION}" --host=$X10_TARGET --build='$(../config.guess)' --disable-ipv6 ac_cv_file__dev_ptmx=yes ac_cv_file__dev_ptc=no
}
