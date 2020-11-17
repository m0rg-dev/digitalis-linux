set -e

cd $(dirname $0)

echo "Ensuring signatures..."
sh sign_unsigned.sh

echo "Building repository..."
mkdir -p repo
rsync -av ../rpmbuild/RPMS --include='*.digi2.*.rpm' --include='*/' --exclude='*' repo/
createrepo_c repo/
cp index.html repo/
cp mirrorlist.txt repo/

echo "Uploading..."
aws s3 sync repo s3://digitalis-repository
