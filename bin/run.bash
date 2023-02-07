#!/bin/bash
args=("$@")
if [[ " ${args[@]} " =~ " --no-code-coverage " ]] || ([[ ! " ${args[@]} " =~ " --mode test " ]] && [[ ! " ${args[@]} " =~ " --mode=test " ]])
then
  args=( "${args[@]//--no-code-coverage/}" )
  node ./node_modules/pythagora/RunPythagora.js "${args[@]}"
else
  nyc_args=( "--reporter=text-summary" )
  if [[ " ${args[@]} " =~ " --full-code-coverage-report " ]]
  then
    args=( "${args[@]//--full-code-coverage-report/}" )
    nyc_args+=( "--reporter=lcov" )
    nyc_args+=( "--report-dir=./pythagora_data/code_coverage_report" )
  fi
  if [ -f "./node_modules/pythagora/node_modules/nyc/bin/nyc.js" ]
  then
    ./node_modules/pythagora/node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/pythagora/RunPythagora.js "${args[@]}"
  else
     ./node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/pythagora/RunPythagora.js "${args[@]}"
  fi
fi
