set -e

cd $(dirname $0)

if [ ! -e ".changelog_uid" ]; then
    echo "Need a .changelog_uid file so I know who you are"
    false
fi

spec=$1

sh find_checksums.sh $spec

specbase=$(basename -s .spec $spec)
version=$(rpmspec -q --qf '%{version}\n' --define '_build %{_target}' --define '_host %{_build}' ../rpmbuild/SPECS/${spec} 2>/dev/null | head -n1)
release=$(rpmspec -q --qf '%{release}\n' --define '_build %{_target}' --define '_host %{_build}' --define 'dist %{nil}' ../rpmbuild/SPECS/${spec} 2>/dev/null | head -n1)

echo ""                                                                     > /tmp/bump_changelog.${specbase}
echo "- $(date +%Y-%m-%d) $(cat .changelog_uid) $version release $release" >> /tmp/bump_changelog.${specbase}
echo "  Updated to version $version."                                      >> /tmp/bump_changelog.${specbase}

sed -i "/%changelog/ r /tmp/bump_changelog.$specbase" ../rpmbuild/SPECS/${spec}

rm /tmp/bump_changelog.$specbase

echo "$specbase $version release $release: Updated to version $version."   >> /tmp/bump_changelog_commit

