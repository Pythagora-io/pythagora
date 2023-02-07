<h1>Setup</h1>

1. Install Pythagora globally by running
   ```
   npm install pythagora
   ```
2. Integrate Pythagora by adding the Express app and mongoose instance to `global.Pythagora` right after you initialize express/mongoose. Eg. if you initialize Express with `let app = express();` than add this on the next line:
    ```
    if (global.Pythagora) global.Pythagora.setApp(app);
   ```
   <br><br>
<h1>Capturing requests</h1>

1. <b>From the root directory</b> run Pythagora in a capture mode first to capture test data and mocks.
      ```
      npx pythagora --mode capture --initScript <path to the file you use to start the server>
      ```
   Eg. if you start the server with `node server.js` than the command would be:
      ```
      npx pythagora --mode capture --initScript server.js
      ```
2. Click around your application or make requests to your API. Pythagora will capture all requests and responses.
<br><br>
<h1>Testing</h1>
After you captured all request you want, you can use Pythagora to run tests.

1. Run Pythagora in a test mode to run the tests.
      ```
      pythagora --mode test --script <path to the file you use to start the server>
      ```
<br><br><br>
<h1>Code Coverage Report</h1>
Code coverage is a great metric while building automated tests as it shows us which lines of code are covered by the tests. Pythagora uses `nyc` to generate report about code that was covered with Pythagora tests.

By default, Pythagora will show you basic code coverage report in the console. If you want to generate a more detailed report, you can do so by running Pythagora with `--full-code-coverage-report` flag or if you don't want any code coverage displayed, run Pythagora with `--no-code-coverage`.
When you run Pythagora with `--full-code-coverage-report` flag, it will generate a `code_coverage_report` directory in the `pythagora_data` directory in the root of your project. Inside that directory you will find `lcov-report/index.html` file that you can open in your browser to see the code coverage report.

<br><br><br>
<h1>Deep dive</h1>
If you are interested in what has been recorded with pythagora
you can see files in your root directory inside <strong><i>pythagora_data</i></strong> directory.
Those are tests that Pythagora runs when you run command

```
node RunPythagoraTests.js
```
