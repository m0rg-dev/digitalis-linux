set -e

cd $(dirname $0)

if [ ! -e ".changelog_uid" ]; then
    echo "Need a .changelog_uid file so I know who you are"
    false
fi

spec=$1

if [[ -z $2 ]]; then
    sh find_checksums.sh $spec
fi

specbase=$(basename -s .spec $spec)
version=$(rpmspec -q --qf '%{version}\n' --define '_build %{_target}' --define '_host %{_build}' ../rpmbuild/SPECS/${spec} 2>/dev/null | head -n1)
release=$(rpmspec -q --qf '%{release}\n' --define '_build %{_target}' --define '_host %{_build}' --define 'dist %{nil}' ../rpmbuild/SPECS/${spec} 2>/dev/null | head -n1)

echo ""                                                                     > /tmp/bump_changelog.${specbase}
echo "* $(date +"%a %b %d %Y") $(cat .changelog_uid) $version-$release"    >> /tmp/bump_changelog.${specbase}
if [[ -n $2 ]]; then
    echo "  $2"                                                            >> /tmp/bump_changelog.${specbase}
else
    echo "  Updated to version $version."                                  >> /tmp/bump_changelog.${specbase}
fi

sed -i "/%changelog/ r /tmp/bump_changelog.$specbase" ../rpmbuild/SPECS/${spec}

rm /tmp/bump_changelog.$specbase

echo "$specbase $version-$release: Updated to version $version."   >> /tmp/bump_changelog_commit

