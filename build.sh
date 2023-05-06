#! /bin/bash

REV=$(($(date +%s%N)/1000000))
ZIP_BUILD="build"

rm ./*.zip 2> /dev/null
rm ./public/build/* 2> /dev/null
yarn build
rm ./public/build/*.map
cd ./public

kaios=(2.5 3.0)
exc_manifest=(manifest.webmanifest manifest.webapp)

for (( i=0;i<${#kaios[@]};i++ ))
do
  file_name="${ZIP_BUILD}_${kaios[$i]}_${REV}.zip"
  zip -r "./${file_name}" * -x "${exc_manifest[$i]}" screenshot && mv "./${file_name}" ../
done
