1. Add RunPytagora.js into the root of your repo
2. Modify RunPytagora.js to include the file you would usually run
   Eg. If you usually run ``node app/app.js``, in RunPytagora.js, add
   ```
    var app = require('./app/app.js');
   ```

3. Right after you initiate express, add it to Pytagora
    ```
    let app = express();
    global.Pytagora.setApp(app);
   ```
3. Modify Run 
