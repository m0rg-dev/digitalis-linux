set -e

cd $(dirname $0)
for pkg in $(find ../rpmbuild/RPMS -type f -name '*.rpm'); do
    rpm -K $pkg | grep -q signatures || rpmsign --quiet --key-id=EA7751C6CE4B64DA --addsign $pkg
done
