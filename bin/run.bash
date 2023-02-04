#!/bin/bash
args=("$@")
if [[ " ${args[@]} " =~ " --no-code-coverage " ]] || ([[ ! " ${args[@]} " =~ " --mode test " ]] && [[ ! " ${args[@]} " =~ " --mode=test " ]])
then
  args=( "${args[@]//--no-code-coverage/}" )
  node ./node_modules/pytagora/RunPytagora.js "${args[@]}"
else
  nyc_args=( "--reporter=text-summary" )
  if [[ " ${args[@]} " =~ " --full-code-coverage-report " ]]
  then
    args=( "${args[@]//--full-code-coverage-report/}" )
    nyc_args+=( "--reporter=lcov" )
    nyc_args+=( "--report-dir=./pytagora_data/code_coverage_report" )
  fi
  if [ -f "./node_modules/pytagora/node_modules/nyc/bin/nyc.js" ]
  then
    ./node_modules/pytagora/node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/pytagora/RunPytagora.js "${args[@]}"
  else
     ./node_modules/nyc/bin/nyc.js "${nyc_args[@]}" node ./node_modules/pytagora/RunPytagora.js "${args[@]}"
  fi
fi
