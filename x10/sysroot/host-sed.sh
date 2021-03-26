source ../lib.sh

export PACKAGE=host-sed
export VERSION=4.8
export INHERIT_ENVIRONMENT=1

x10-generate() {
    x10-import ./host-xgcc.sh
    x10-import ./host-glibc.sh

    fetch-source "sed-${VERSION}" "f79b0cfea71b37a8eeec8490db6c5f7ae7719c35587f21edb0617f370eeff633" \
        "https://ftpmirror.gnu.org/gnu/sed/sed-${VERSION}.tar.gz" \
        "https://ftp.gnu.org/gnu/sed/sed-${VERSION}.tar.gz"
    setup-build-dirs "sed-${VERSION}"
    build-autoconf "sed-${VERSION}" --host=$X10_TARGET --build='$(../build-aux/config.guess)'
}
