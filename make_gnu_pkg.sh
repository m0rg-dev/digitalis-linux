CATEGORY=$1
PACKAGE=$2
VERSION=$3

mkdir -p packages/$CATEGORY
echo  >packages/$CATEGORY/$PACKAGE@$VERSION.sh "export VERSION=$VERSION

PACKAGE=$PACKAGE
UPSTREAM="http://ftp.gnu.org/gnu/"

use_mod acmake
"

echo "download http://ftp.gnu.org/gnu/$PACKAGE/$PACKAGE-$VERSION.tar.xz" >> download_packages.sh