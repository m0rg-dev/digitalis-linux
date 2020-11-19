# fix up some non-compliant %changelog entries. should only need to run this once...

use strict;
use warnings;

while(<>) {
    if(m/\%changelog/..0) {
        s/^-\s+(\d+-\d+-\d+) (.*) ((?:\w+\.?)+) release (.*)$/"* " . (`date -d $1 +"%a %b %d %Y"` =~ y|\n||dr) . " $2 $3-$4"/e;
        s/^-\s+(\d+-\d+-\d+) (.*) <no version change>$/"* " . (`date -d $1 +"%a %b %d %Y"` =~ y|\n||dr) . " $2"/e;
    }
    print;
}