#create board mods
amod=$(node modconsole/createmod.js)
bmod=$(node modconsole/createmod.js)
cmod=$(node modconsole/createmod.js)
devmod=$(node modconsole/createmod.js)
polmod=$(node modconsole/createmod.js)
techmod=$(node modconsole/createmod.js)
vmod=$(node modconsole/createmod.js)

#create boards
aboard=$(node board/createboard.js $amod $1 "Animu & Mango")
bboard=$(node board/createboard.js $bmod $1 "Random")
cboard=$(node board/createboard.js $cmod $1 "Anime/Cute")
devboard=$(node board/createboard.js $devmod $1 "Smugboard Development")
polboard=$(node board/createboard.js $polmod $1 "Politically Incorrect")
techboard=$(node board/createboard.js $techmod $1 "Technology")
vboard=$(node board/createboard.js $vmod $1 "Video Games")

#add boards to site
ares=$(node site/addboardtosite.js $2 $aboard a)
bres=$(node site/addboardtosite.js $2 $bboard b)
cres=$(node site/addboardtosite.js $2 $cboard c)
devres=$(node site/addboardtosite.js $2 $devboard dev)
polres=$(node site/addboardtosite.js $2 $polboard pol)
techres=$(node site/addboardtosite.js $2 $techboard tech)
vres=$(node site/addboardtosite.js $2 $vboard v)

