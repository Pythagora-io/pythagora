#!/bin/bash
args=("$@")
flag=${args[@]}

# Extract the name field from the package.json file
name=$(grep '"name"' package.json | awk -F: '{print $2}' | tr -d '", ')
version=$(grep '"version"' package.json | awk -F: '{print $2}' | tr -d '", ')

if [ "$flag" == "production" ] && [ "$name" == "pythagora" ]
then
  echo "Publishing new pythagora PRODUCTION version! ($version)"
  read -p "Press Y to continue or N to exit: " choice

  while [ "$choice" != "Y" ]; do
    if [ "$choice" == "N" ]; then
      exit 1
    fi
    read -p "Invalid input. Press Y to continue or N to exit: " choice
  done
  npm publish

elif [ "$flag" != "production" ] && [ "$name" == "pythagora" ]
then
  echo "The name in package.json is: $name but you didn't set flag 'production'."
  exit 1

elif [ "$flag" == "production" ] && [ "$name" != "pythagora" ]
then
  echo "Flag 'production' is set but name in package.json is $name."
  exit 1

else
  echo "Publishing new pythagora DEVELOPMENT version!"
  npm publish
fi
