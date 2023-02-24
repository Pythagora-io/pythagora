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


<br>
<h1 id="alphaversion">🏁 Alpha version</h1>
This is an alpha version of Pythagora. To get an update about the beta release or to give a <b>suggestion on tech (framework / database) you want Pythagora to support</b> you can 👉 <a href="http://eepurl.com/ikg_nT" target="_blank">add your email / comment here</a> 👈 .
<br>
<br>


<h1 id="howitworks">🏗️ How it works</h1>

To integrate Pythagora into your Node.js app, you just need to install the pythagora package
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
<b>If a test does an update to the database, Pythagora also checks the database to see if it was updated correctly.</b>
<br>
<br>
<div align="center">
  <a href="https://youtu.be/BVR7rCdBVdY"><img src="https://user-images.githubusercontent.com/10895136/217778681-bce3186f-c92d-4861-94cd-ad8bad29a2ff.gif" alt="Pythagora Alpha Demo"></a>
</div>
<p align=center>
  <a target="_blank" href="https://youtu.be/BVR7rCdBVdY">Watch Pythagora Demo (3 min)</a>
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
<h1 id="testdata">🗺️️ Where can I see the tests?</h1>
Each captured test is saved in <strong><i>pythagora_data</i></strong> directory at the root of your repository.
Each JSON file in this repository represents one endpoint that was captured and each endpoint can have many captured tests.
If you open these files, you will see an array in which each object represents a single test. All data that's needed to run a test
is stored in this object. Here is an example of a test object.

```json
{
  "id": "b47cbee2-4a47-4b2c-80a0-feddae3081b3",
  "endpoint": "/api/boards/", // endpoint that was called
  "body": {}, // body payload that was sent with the request
  "query": {}, // query params that were sent with the request
  "params": {}, // params that were sent with the request
  "method": "GET", // HTTP method that was used
  "headers": { // headers that were sent with the request
    "x-forwarded-host": "localhost:3000",
    ...
  },
  "statusCode": 200, // status code that was returned
  "responseData": "...", // response data that was received
  "intermediateData": [ // server activity that was captured during the request
    {
      "type": "mongo", // type of the activity - mongo query in this case
      "req": { // data for mongo query that was executed
        "collection": "users",
        "op": "update",
        "options": {},
        "_conditions": {
          "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")"
        },
         "_update": { // data that needs to be updated
            "name": "Steve",
            ...
         }
      },
      "preQueryRes": [ // data that was present in the database before the query was executed
        {
          "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
          "name": "Michael",
          ...
        }
      ],
      "mongoRes": [ // data that was returned by the query
        {
          "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
          "name": "Steve",
          ...
        }
      ],
      "postQueryRes": [ // data that was present in the database after the query was executed
        {
          "_id": "ObjectId(\"63f5e8272c78361761e9fcf1\")",
          "name": "Steve",
           ...
        }
      ]
    }
  ],
  "createdAt": "2023-02-22T14:57:52.362Z" // date when the test was captured
}
```


<br><br>
<h1 id="support">⛑️ Support</h1>

For now, we support projects that use:
- <a href="https://www.npmjs.com/package/express" target="_blank">Express</a> (it can be used explicitly or under the hood, like in <a href="https://www.npmjs.com/package/@apollo/server" target="_blank">Apollo server</a> or <a href="https://nestjs.com/" target="_blank">NestJS</a>)
- <a href="https://www.npmjs.com/package/mongoose" target="_blank">Mongoose</a> (in the upcoming weeks, we'll add support for the native <a href="https://www.npmjs.com/package/mongodb" target="_blank">MongoDB</a> driver as well)
- <a href="https://redis.io/" target="_blank">Redis</a>
  <br>
  <br>
#### Other technologies that Pythagora works with:
<div align="left" class="supported_technologies">
  <a href="#">
    <img src="https://user-images.githubusercontent.com/10895136/221124584-d82d1ab0-e8b4-4710-90c7-a2fa1450667d.png" width="50" alt="Logo 1" style="border-radius: 50%;" />
    <br />Apollo server
  </a>
  <a href="#">
    <img src="https://user-images.githubusercontent.com/10895136/221125424-699d5159-e68d-439b-91be-68c766e6b8c3.png" width="50" alt="Logo 2" style="border-radius: 50%" />
    <br />GraphQL
  </a>
  <a href="#">
    <img src="https://user-images.githubusercontent.com/10895136/221124832-2c0e7268-2e38-4779-9928-543efadf63a9.png" width="50" alt="Logo 3" style="border-radius: 50%" />
    <br />NestJS
  </a>
  <div style="display:inline-block;height:80px;width:1px;background-color:#ccc;margin:0 10px 0 35px;"></div>
  <a href="#" class="upcoming_support">
    <img src="https://user-images.githubusercontent.com/10895136/221130405-1073a56b-9056-42b7-acb3-875fee2c40ce.png" width="50" alt="Logo 1" style="border-radius: 50%;" />
    <br />Next.js [upcoming]
  </a>
  <a href="#" class="upcoming_support">
    <img src="https://user-images.githubusercontent.com/10895136/221130597-4efae929-966f-4312-b47d-845e70f66984.jpg" width="50" alt="Logo 1" style="border-radius: 50%;" />
    <br />Nuxt.js [upcoming]
  </a>
  <a href="#" class="upcoming_support">
    <img src="https://user-images.githubusercontent.com/10895136/221130228-432f0a0c-0ac6-4154-b775-b6287760bedb.png" width="50" alt="Logo 1" style="border-radius: 50%;" />
    <br />PostgreSQL [upcoming]
  </a>
  <style>
    .supported_technologies > a {
      display: inline-block;
      text-align: center;
      margin: 0 10px;
      max-width: 100px;
      vertical-align: top;
    }
    .upcoming_support {
      opacity: 0.3;
    }
  </style>
</div>


<br>
<h1 id="connectwithus">🔗 Connect with us</h1>
💬 Join the discussion on <a href="https://discord.gg/npC5TAfj6e" target="_blank">our Discord server</a>.
<br><br>
⭐ Star this repo to show support.
<br><br>
<br><br>

<br><br>

