echo "Populating boards..."

#create board mods
amod=$(node scripts/createmod.js $1)
bmod=$(node scripts/createmod.js $1)
cmod=$(node scripts/createmod.js $1)
devmod=$(node scripts/createmod.js $1)
polmod=$(node scripts/createmod.js $1)
techmod=$(node scripts/createmod.js $1)
vmod=$(node scripts/createmod.js $1)

#create boards
aboard=$(node scripts/createboard.js $1 $amod $1 "Animu & Mango")
bboard=$(node scripts/createboard.js $1 $bmod $1 "Random")
cboard=$(node scripts/createboard.js $1 $cmod $1 "Anime/Cute")
devboard=$(node scripts/createboard.js $1 $devmod $1 "Smugboard Development")
polboard=$(node scripts/createboard.js $1 $polmod $1 "Politically Incorrect")
techboard=$(node scripts/createboard.js $1 $techmod $1 "Technology")
vboard=$(node scripts/createboard.js $1 $vmod $1 "Video Games")

#add boards to site
ares=$(node scripts/addboardtosite.js $2 $aboard a)
bres=$(node scripts/addboardtosite.js $2 $bboard b)
cres=$(node scripts/addboardtosite.js $2 $cboard c)
devres=$(node scripts/addboardtosite.js $2 $devboard dev)
polres=$(node scripts/addboardtosite.js $2 $polboard pol)
techres=$(node scripts/addboardtosite.js $2 $techboard tech)
vres=$(node scripts/addboardtosite.js $2 $vboard v)

echo "Done"
