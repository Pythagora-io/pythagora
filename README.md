<h1>Setup and capturing requests</h1>

1. Add RunPytagora.js into the root of your repo
2. Modify RunPytagora.js by including the file you would usually run
      Eg. If you usually run ``node app/app.js``, in RunPytagora.js, change appPath to:
      ```
       const appPath = './app/app.js';
      ```

3. Right after you initiate express, add it to Pytagora
    ```
    let app = express();
    if (global.Pytagora) global.Pytagora.setApp(app);
   ```
4. Set Pytagora in appropriate mode. Change mode in RunPytagora.js:
      ```
      const mode = 'capture';
      ```
   1. `capture` mode is for recording your requests and creating new test cases
   2. `test` mode is when you want to run already recorded tests
5. Run Pytagora:
      ```
      node RunPytagora.js
      ```
<br><br><br>
<h1>Testing</h1>
After you captured all request you want, you can use Pytagora to run tests.

1. Change mode in RunPytagora.js to `test` (as mentioned above)
2. Start your application:
      ```
      node RunPytagora.js
      ```
3. Run tests:
      ```
      node RunPytagoraTests.js
      ```
<br><br><br>
<h1>Deep dive</h1>
If you are interested in what has been recorded with pytagora
you can see files in your root directory inside <strong><i>pytagora_data</i></strong> directory.
Those are tests that Pytagora runs when you run command

```
node RunPytagoraTests.js
```
