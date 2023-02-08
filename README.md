<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/217571898-14e94ea7-75a5-4a50-a7dc-486e10a8b462.png">
    <img height="150px" alt="Text changing depending on mode. Light: 'So light!' Dark: 'So dark!'" src="https://user-images.githubusercontent.com/10895136/217490853-013a21d3-e4a2-4c1d-a38c-e3c835788592.png">
  </picture>
</p>
<p align=center>
  Generate 90% code coverage with integration tests in 1 hour
</p>
<br>
Pythagora is a tool that generates integration tests for your Node.js app by recording server data without you having to write a single line of code.



<h1>🏗️ How it works</h1>

To integrate Pythagora into your Node.js app, you just need to paste one line of code and run the Pythagora capture command. Then, just play around with your app and from all API requests and database queries Pythagora will generate integration tests.

Pythagora records all requests to endpoints of your app, along with Mongo/Redis queries. Then, when you run the tests, Pythagora mocks all responses from Redis and simulates the database conditions from the time when the API requests were captured.
<br>
<br>
Tests do not depend on the state of the database. When an API request is being recorded, Pythagora saves all documents used during the request. Later, when you run the actual test, it restores those documents into `pythagoraDb` database. This way, the app gets the same data it got from the database on the machine on which it was captured and the data on your local database will NOT be affected while running tests.
<br>
<br>
If the request updates the database, Pythagora also tests the database to see if it was updated correctly.
<br>
<br>
<div align="center">
  <a href="https://www.youtube.com/watch?v=Be9ed-JHuQg"><img src="https://img.youtube.com/vi/Be9ed-JHuQg/0.jpg" alt="Pythagora Alpha Demo"></a>
</div>
<p align=center>
  <a target="_blank" href="https://www.youtube.com/watch?v=Be9ed-JHuQg">Watch Pythagora Demo (2:28 min)</a>
</p>
<br>
<br>
<h1>⚙️ Setup</h1>

1. Install Pythagora by running
   <br><br>
   ```
   npm install pythagora
   ```
2. Integrate Pythagora by adding the Express app and mongoose instance to `global.Pythagora` right after you initialize express/mongoose. Eg. if you initialize Express with `let app = express();` then add this on the next line:
    <br><br>
    ```javascript
    if (global.Pythagora) global.Pythagora.setApp(app);
   ```
   <br>
   <b>IMPORTANT: make sure that you add this line before any routes or middlewares are configured.</b>
<br><br>
<h1>🎥 Capturing tests</h1>

1. <b>From the root directory</b> run Pythagora in a capture mode first to capture test data and mocks.
      <br><br>
      ```
      npx pythagora --mode capture --initScript ./path/to/your/server.js
      ```
   Eg. if you start your Node.js app with `node ./server.js` then the command would be:
      <br><br>
      ```
      npx pythagora --mode capture --initScript ./server.js
      ```
2. Click around your application or make requests to your API. Pythagora will capture all requests and responses.
<br><br>
<h1>▶️ Executing tests</h1>

After you captured all requests you want, you just need to add the mode parameter `--mode test` to the Pythagora command.
   <br>
   ```
   npx pythagora --script ./path/to/your/server.js --mode test
   ```   
      
<br><br>
<h1>📝 Code Coverage Report</h1>

Code coverage is a great metric while building automated tests as it shows us which lines of code are covered by the tests. Pythagora uses `nyc` to generate a report about code that was covered with Pythagora tests. By default, Pythagora will show you the basic code coverage report summary when you run tests.
<br>
<br>

If you want to generate a more detailed report, you can do so by running Pythagora with `--full-code-coverage-report` flag. Eg.
   ```
   npx pythagora --script ./path/to/your/server.js --mode test --full-code-coverage-report
   ```
You can find the code coverage report inside `pythagora_data` folder in the root of your repository. You can open the HTML view of the report by opening `pythagora_data/code_coverage_report/lcov-report/index.html`.

<br>

In case you don't want the code coverage to be shown at all while running tests, you can run the tests with `--no-code-coverage` parameter.

<br><br>
<h1>ℹ️ Test data</h1>
If you are interested in what has been recorded with pythagora
you can see files in your root directory inside <strong><i>pythagora_data</i></strong> directory.
Those are tests that Pythagora captured.



<br><br>
<h1>🔗 Connect with us</h1>
📫 Stay updated by subscribing to <a href="http://eepurl.com/ikg_nT" target="_blank">our email list here</a>.
<br><br>
💬 Join the discussion at <a href="https://github.com/Pythagora-io/pythagora/discussions" target="_blank">Github discussions</a> or on <a href="https://discord.gg/9ykSuFGq" target="_blank">our Discord server</a>.
<br><br>
⭐ Star this repo to show your interest/support.
<br><br>

