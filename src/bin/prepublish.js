const RELEASE_MODE = !!(process.env.RELEASE_MODE)

if (!RELEASE_MODE) {
    console.log('------------------------------------------------------------------------------')
    console.log('If you want to publish new version of Pythagora please use \'npm run publish-pythagora\' instead of \'npm publish\'.')
    console.log('------------------------------------------------------------------------------')
    process.exit(1)
}
