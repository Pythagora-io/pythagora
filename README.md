<h1>Setup</h1>

1. Install Pytagora globally by running
   ```
   npm install pytagora
   ```
2. Integrate Pytagora by adding the Express app and mongoose instance to `global.Pytagora` right after you initialize express/mongoose. Eg. if you initialize Express with `let app = express();` than add this on the next line:
    ```
    if (global.Pytagora) global.Pytagora.setApp(app);
   ```
   <br><br>
<h1>Capturing requests</h1>

1. <b>From the root directory</b> run Pytagora in a capture mode first to capture test data and mocks.
      ```
      npx pytagora --mode capture --initScript <path to the file you use to start the server>
      ```
   Eg. if you start the server with `node server.js` than the command would be:
      ```
      npx pytagora --mode capture --initScript server.js
      ```
2. Click around your application or make requests to your API. Pytagora will capture all requests and responses.
<br><br>
<h1>Testing</h1>
After you captured all request you want, you can use Pytagora to run tests.

1. Run Pytagora in a test mode to run the tests.
      ```
      pytagora --mode test --script <path to the file you use to start the server>
      ```
<br><br><br>
<h1>Code Coverage Report</h1>
Code coverage is a great metric while building automated tests as it shows us which lines of code are covered by the tests. Pytagora uses `nyc` to generate report about code that was covered with Pytagora tests.

By default, Pytagora will show you basic code coverage report in the console. If you want to generate a more detailed report, you can do so by running Pytagora with `--full-code-coverage-report` flag or if you don't want any code coverage displayed, run Pytagora with `--no-code-coverage`.
When you run Pytagora with `--full-code-coverage-report` flag, it will generate a `code_coverage_report` directory in the `pytagora_data` directory in the root of your project. Inside that directory you will find `lcov-report/index.html` file that you can open in your browser to see the code coverage report.

<br><br><br>
<h1>Deep dive</h1>
If you are interested in what has been recorded with pytagora
you can see files in your root directory inside <strong><i>pytagora_data</i></strong> directory.
Those are tests that Pytagora runs when you run command

```
node RunPytagoraTests.js
```
