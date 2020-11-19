set -e

cd $(dirname $0)

if [ ! -e ".changelog_uid" ]; then
    echo "Need a .changelog_uid file so I know who you are"
    false
fi

old_version=$1
new_version=$2

for spec in $(fgrep -l '%define system_python '$old_version ../rpmbuild/SPECS/*); do
    echo $spec
    # bump the release number
    perl -pe 's/Release:(\s*)(\d+)/"Release:$1" . ($2+1)/e' -i $spec
    # change the python version
    sed -i "s/%define system_python $old_version/%define system_python $new_version/" $spec
    # update the changelog
    sh bump_changelog.sh $(basename $spec) "Updated to Python $new_version"
done
