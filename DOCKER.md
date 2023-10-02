```
docker build -t pythagora .

docker run -v ./:/data -it pythagora npx pythagora \
  --unit-tests \
  --path /data/src/helpers/api.js
```
