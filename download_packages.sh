download() {
    local url=$1
    local file=$(basename $1)
    if [ -e distfiles/$file ]; then
        echo "$file: already downloaded"
    else
        wget $url -O distfiles/$file
    fi
}

download https://cdn.kernel.org/pub/linux/kernel/v5.x/linux-5.7.5.tar.xz
download https://www.kernel.org/pub/linux/docs/man-pages/man-pages-5.05.tar.xz
download http://ftp.gnu.org/gnu/glibc/glibc-2.31.tar.xz
