set -e

cd $(dirname $0)

spec=$1

for source in $(rpmspec -P --define '_build %{_target}' --define '_host %{_build}' ../rpmbuild/SPECS/$spec 2>/dev/null | grep -P 'Source\d+:\s*\w+://' | awk '{print $2}'); do
    if [[ -n $source ]]; then
        curl -s -L -f $source > /tmp/$(basename $source)
        oldpwd=$(pwd)
        cd /tmp
        sha256sum $(basename $source)
        rm $(basename $source)
        cd $oldpwd
    fi
done