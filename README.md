<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/10895136/217571898-14e94ea7-75a5-4a50-a7dc-486e10a8b462.png">
    <img height="300px" alt="Text changing depending on mode. Light: 'So light!' Dark: 'So dark!'" src="https://user-images.githubusercontent.com/10895136/217490853-013a21d3-e4a2-4c1d-a38c-e3c835788592.png">
  </picture>
</p>
<p align=center>
  Generate 90% code coverage with integration tests in 1 hour
</p>
<br>
Pythagora is a tool that generates integration tests for your Node.js app by recording server activity without you having to write a single line of code.


<h1 id="tableofcontents">Table of Contents</h1>

1. [Alpha version](#alphaversion)
2. [How it works](#howitworks)
3. [Setup](#setup)
4. [Capturing tests](#capturingtests)
5. [Executing tests](#executingtests)
6. [Code coverage report](#codecoveragereport)
7. [Test data](#testdata)
8. [Connect with us](#connectwithus)

<br>
<h1 id="alphaversion">🏁 Alpha version</h1>
This is an alpha version of Pythagora. To get an update about beta release or to give a <b>suggestion on tech (framework / database) you want Pythagora to support</b> you can 👉 <a href="http://eepurl.com/ikg_nT" target="_blank">add your email / comment here</a> 👈 .
<br>
<br>

<b>NOTE:</b> For now we support projects that use:
   - <a href="https://www.npmjs.com/package/express" target="_blank">Express</a> (it can be under the hood, like <a href="https://www.npmjs.com/package/@apollo/server" target="_blank">Apollo server</a>, <a href="https://nestjs.com/" target="_blank">NestJS</a>,...)
   - <a href="https://www.npmjs.com/package/mongoose" target="_blank">Mongoose</a> (we are looking to change that in upcoming weeks to native <a href="https://www.npmjs.com/package/mongodb" target="_blank">MongoDB</a> and then add support for other DBs like <a href="https://www.postgresql.org/" target="_blank">PostgreSQL</a>)
   - <a href="https://redis.io/" target="_blank">Redis</a>
<br>


<h1 id="howitworks">🏗️ How it works</h1>

To integrate Pythagora into your Node.js app, you just need to install pythagora package
```
npm install pythagora
```
and run the Pythagora capture command. Then, just play around with your app and from all API requests and database queries Pythagora will generate integration tests.

<h3>1. Capturing requests</h3>
Pythagora records all requests to endpoints of your app with the response and everything that's happening during the request. Currently, that means all Mongo and Redis queries with responses (in the future 3rd party API requests, disk IO operations, etc.). Then, when you run the tests, Pythagora can simulate the server conditions from the time when the request was captured.
<h3>2. Running tests</h3>
When running tests, it doesn’t matter what database is your Node.js connected to or what is the state of that database. Actually, that database is never touched or used —> instead, Pythagora creates a special, ephemeral `pythagoraDb` database, which it uses to restore the data before each test is executed, which was present at the time when the test was recorded. Because of this, tests can be run on any machine or environment.
<br>
<br>
If a test does an update to the database, Pythagora also checks the database to see if it was updated correctly.
<br>
<br>
<div align="center">
  <a href="https://youtu.be/KnWjL9f7N8w"><img src="https://user-images.githubusercontent.com/10895136/217778681-bce3186f-c92d-4861-94cd-ad8bad29a2ff.gif" alt="Pythagora Alpha Demo"></a>
</div>
<p align=center>
  <a target="_blank" href="https://youtu.be/KnWjL9f7N8w">Watch Pythagora Demo (2:28 min)</a>
</p>
<br>
<br>
<h1 id="setup">⚙️ Setup</h1>

1. Install Pythagora by running
   <br><br>
   ```
   npm install pythagora
   ```
   And that's it! You are ready to start recording your integration tests!
<br>
<h1 id="capturingtests">🎥 Capturing tests</h1>

1. <b>From the root directory</b> run Pythagora in a capture mode first to capture test data and mocks.
   <br><br>
      ```
      npx pythagora --initScript ./path/to/your/server.js --mode capture
      ```
   Eg. if you start your Node.js app with `node ./server.js` then the command would be:
   <br><br>
      ```
      npx pythagora --initScript ./server.js --mode capture
      ```
2. Click around your application or make requests to your API. Pythagora will capture all requests and responses.
   <br><br>
NOTE: To stop the capture, you can exit the process like you usually do (Eg. `Ctrl + C`)   
<br>
<h1 id="executingtests">▶️ Executing tests</h1>

After you captured all requests you want, you just need to change the mode parameter to `--mode test` in the Pythagora command.
<br>
   ```
   npx pythagora --initScript ./path/to/your/server.js --mode test
   ```   

<br><br>
<h1 id="codecoveragereport">📝 Code Coverage Report</h1>

Code coverage is a great metric while building automated tests as it shows us which lines of code are covered by the tests. Pythagora uses `nyc` to generate a report about code that was covered with Pythagora tests. By default, Pythagora will show you the basic code coverage report summary when you run tests.
<br>
<br>

If you want to generate a more detailed report, you can do so by running Pythagora with `--full-code-coverage-report` flag. Eg.
   ```
   npx pythagora --initScript ./path/to/your/server.js --mode test --full-code-coverage-report
   ```
You can find the code coverage report inside `pythagora_data` folder in the root of your repository. You can open the HTML view of the report by opening `pythagora_data/code_coverage_report/lcov-report/index.html`.

<br>

In case you don't want the code coverage to be shown at all while running tests, you can run the tests with `--no-code-coverage` parameter.

<br><br>
<h1 id="testdata">ℹ️ Test data</h1>
If you are interested in what has been recorded with pythagora
you can see files in your root directory inside <strong><i>pythagora_data</i></strong> directory.
Those are tests that Pythagora captured.



<br><br>
<h1 id="connectwithus">🔗 Connect with us</h1>
💬 Join the discussion on <a href="https://discord.gg/npC5TAfj6e" target="_blank">our Discord server</a>.
<br><br>
⭐ Star this repo to show support.
<br><br>
<br><br>

[Back to top](#tableofcontents)
<br><br>

