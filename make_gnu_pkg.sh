CATEGORY=$1
PACKAGE=$2
VERSION=$3
if [ -n "$4" ]; then
    COMP="COMP=$4\n"
fi

mkdir -p packages/$CATEGORY
echo -e >packages/$CATEGORY/$PACKAGE@$VERSION.sh "export VERSION=$VERSION

PACKAGE=$PACKAGE
${COMP}UPSTREAM="http://ftp.gnu.org/gnu/"

use_mod acmake
"

echo "download http://ftp.gnu.org/gnu/$PACKAGE/$PACKAGE-$VERSION.tar.xz" >> download_packages.sh