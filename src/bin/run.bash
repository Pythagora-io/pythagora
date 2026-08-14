#!/bin/bash
args=("$@")
init_command=
init_script=
APP_PID=
inspect="--inspect=0"
mode="capture"
yellow=$(tput setaf 3)
green=$(tput setaf 2)
reset=$(tput sgr0)
bold=$(tput bold)
pythagora_dir="$2"

function exit_handler {
  while [ ! -f "./.pythagora/finishingup" ]
  do
    sleep .5
  done

  rm -f "./.pythagora/finishingup"
  if kill -s SIGINT $1 > /dev/null 2>&1
  then
    sleep .5
  fi
  exit 0
}

for (( i=0; i<${#args[@]}; i++ ))
do
  if [[ "${args[$i]}" =~ ^--init[-_]command$ ]]
  then
    init_command="${args[$i+1]}"
  elif [[ "${args[$i]}" == "--config" ]]
  then
    # TODO refactor and make it flexible
    CONFIG_FILE="./.pythagora/config.json"
    rm "$CONFIG_FILE"

    if [ ! -f "$CONFIG_FILE" ]; then
        mkdir -p ./.pythagora
        touch "./$CONFIG_FILE"
    fi

    API_NAME="${args[$i+1]//--/}"
    API_NAME="${API_NAME//-/_}"
    API_KEY="${args[$i+2]}"
    echo "{" >> $CONFIG_FILE
    echo "    \"$API_NAME\": \"$API_KEY\"" >> $CONFIG_FILE
    echo "}" >> $CONFIG_FILE
    echo "${green}${bold}API key added to config!${reset}"
    exit 0
  elif [[ "${args[$i]}" == "--review" ]]
  then
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/review.js"
    exit 0
  elif [[ "${args[$i]}" == "--tests-eligible-for-export" ]]
  then
    echo "${yellow}${bold}Tests eligible for export:${reset}"
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/testsEligibleForExport.js"
    exit 0
  elif [[ "${args[$i]}" == "--unit-tests" ]]
  then
    echo "${green}${bold}Starting generation of unit tests...${reset}"
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/unit.js"
    exit 0
  
  elif [[ "${args[$i]}" == "--expand-unit-tests" ]]
  then
    echo "${green}${bold}Expanding unit tests...${reset}"
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/unitExpand.js"
    exit 0

  elif [[ "${args[$i]}" == "--export-setup" ]]
  then
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/enterData.js"
    exit 0
  elif [[ "${args[$i]}" =~ ^--rename[-_]tests$ ]]
  then
    node "${pythagora_dir}/src/scripts/renameTests.js"
    exit 0
  elif [[ "${args[$i]}" =~ ^--delete[-_]all[-_]failed$ ]]
  then
    node "${pythagora_dir}/src/scripts/deleteAllFailed.js"
    exit 0
  elif [[ "${args[$i]}" == "--delete" ]]
  then
    PYTHAGORA_CONFIG="$@" node "${pythagora_dir}/src/scripts/deleteTest.js"
    exit 0
  elif [[ "${args[$i]}" == "--export" ]]
  then
    PYTHAGORA_CONFIG="$@" node -e "require('${pythagora_dir}/src/commands/export.js').runExport()"
    exit 0
  elif [[ "${args[$i]}" == "--mode" ]]
  then
    mode="${args[$i+1]}"
  fi
done

if [ -z "$init_command" ]
then
  echo "You need to set '--init-command' flag in Pythagora command! Please check Pythagora options. Exiting..."
  exit 0
fi

if [[ " ${args[@]} " =~ " --no-code-coverage " ]] || ([[ ! " ${args[@]} " =~ " --mode test " ]] && [[ ! " ${args[@]} " =~ " --mode=test " ]])
then
  args=( "${args[@]//--no-code-coverage/}" )
  PYTHAGORA_CONFIG="$@" NODE_OPTIONS="${inspect} --require ${pythagora_dir}/src/RunPythagora.js" $init_command &
else
  nyc_args=( "--reporter=text-summary" )

  if [[ " ${args[@]} " =~ " --full-code-coverage-report " ]]
  then
    args=( "${args[@]//--full-code-coverage-report/}" )
    nyc_args+=( "--reporter=lcov" )
    nyc_args+=( "--report-dir=./pythagora_tests/code_coverage_report" )
  fi

  if [ -f "$pythagora_dir/node_modules/nyc/bin/nyc.js" ]
  then
    PYTHAGORA_CONFIG="$@" NODE_OPTIONS="${inspect} --require ${pythagora_dir}/src/RunPythagora.js" "$pythagora_dir"/node_modules/nyc/bin/nyc.js "${nyc_args[@]}" $init_command &
  else
    PYTHAGORA_CONFIG="$@" NODE_OPTIONS="${inspect} --require ${pythagora_dir}/src/RunPythagora.js" ./node_modules/nyc/bin/nyc.js "${nyc_args[@]}" $init_command &
  fi

fi

APP_PID=$!


if [[ "${mode}" == "capture" ]]
then
  trap exit_handler SIGINT
else
  exit_handler $APP_PID
fi

wait
