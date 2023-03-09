#!/bin/bash
args=("$@")
script_path=$(realpath $0)
pythagora_dir=$(basename $(dirname $(dirname $script_path)))
if [ "$pythagora_dir" == "pythagora-dev" ]
then
  pythagora_dir="/@pythagora.io/pythagora-dev"
fi

if [[ " ${args[@]} " =~ " --no-code-coverage " ]] || ([[ ! " ${args[@]} " =~ " --mode test " ]] && [[ ! " ${args[@]} " =~ " --mode=test " ]])
then
  args=( "${args[@]//--no-code-coverage/}" )
  node ./node_modules/"$pythagora_dir"/RunPythagora.js "${args[@]}"
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
    ./node_modules/"$pythagora_dir"/node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/"$pythagora_dir"/RunPythagora.js "${args[@]}"
  else
     ./node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/"$pythagora_dir"/RunPythagora.js "${args[@]}"
  fi
fi
