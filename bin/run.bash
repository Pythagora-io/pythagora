#!/bin/bash
args=("$@")
script_path=$(realpath $0)
init_command=
init_script=
APP_PID=
mode="capture"
yellow=$(tput setaf 3)
green=$(tput setaf 2)
reset=$(tput sgr0)
bold=$(tput bold)
pythagora_dir=$(basename $(dirname $(dirname $script_path)))

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


if [ "$pythagora_dir" == "pythagora-dev" ]
then
  pythagora_dir="@pythagora.io/pythagora-dev"
fi

for (( i=0; i<${#args[@]}; i++ ))
do
  if [[ "${args[$i]}" == "--init-command" ]]
  then
    init_command="${args[$i+1]}"
  elif [[ "${args[$i]}" == "--init_script" ]]
  then
    init_script="${args[$i+1]}"
  elif [[ "${args[$i]}" == "--mode" ]]
  then
    mode="${args[$i+1]}"
  fi
done


if [[ " ${args[@]} " =~ " --no-code-coverage " ]] || ([[ ! " ${args[@]} " =~ " --mode test " ]] && [[ ! " ${args[@]} " =~ " --mode=test " ]])
then
  args=( "${args[@]//--no-code-coverage/}" )
  PYTHAGORA_CONFIG="$@" NODE_OPTIONS="--inspect --require ./node_modules/${pythagora_dir}/RunPythagora.js" $init_command &
else
  nyc_args=( "--reporter=text-summary" )

  if [[ " ${args[@]} " =~ " --full-code-coverage-report " ]]
  then
    args=( "${args[@]//--full-code-coverage-report/}" )
    nyc_args+=( "--reporter=lcov" )
    nyc_args+=( "--report-dir=./pythagora_tests/code_coverage_report" )
  fi

  if [ -f "./node_modules/$pythagora_dir/node_modules/nyc/bin/nyc.js" ]
  then
    PYTHAGORA_CONFIG="$@" NODE_OPTIONS="--inspect --require ./node_modules/${pythagora_dir}/RunPythagora.js" ./node_modules/"$pythagora_dir"/node_modules/nyc/bin/nyc.js "${nyc_args[@]}" $init_command &
  else
    PYTHAGORA_CONFIG="$@" NODE_OPTIONS="--inspect --require ./node_modules/${pythagora_dir}/RunPythagora.js" ./node_modules/nyc/bin/nyc.js "${nyc_args[@]}" $init_command &
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
