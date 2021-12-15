# Node.JS Template

## Disclaimer

This package is developed for using [TypeScript](http://www.typescriptlang.org/) in Node. Some of the below features may not be very helpful when working in a purely JavaScript environment.

---

## About

The purpose of this repository is to provide a starter template for a NodeJS application using TypeScript.

---

## Requirements

* Node 14.0.0 or up
* Git

---

## Included Features

* [TypeScript](http://www.typescriptlang.org/)
  * Included tslint file
  * Included tsconfig for both dev & production modes
* .gitignore file for using Git
* [Jest](https://jestjs.io/) for unit tests
* NPM scripts for builds, linting, tests & starting
* Visual Studio Code starter launch.json file with debugging
* [Gulp](https://gulpjs.com/) for builds
* Configuration using [nconf](https://github.com/indexzero/nconf#readme)
  * Application arguments
  * Environment variables
  * Config files (more about that below)
* Logging using [winston](https://github.com/winstonjs/winston) and [tsdatautils](https://github.com/MitchCodes/Typescript-DataUtils)
  * Console logging
  * Rotating file logging (with 90 day retention)
  * Azure application insights logging using [tsdatautils](https://github.com/MitchCodes/Typescript-DataUtils)
  * Interfaced with interface ILogger so you can easily plug in your own logger
* Dockerfile to create a docker container
  * See more below
* Kubernetes deployment.yaml file
  * See more below

---

## Usage

### Normal Usage

```
git clone https://github.com/MitchCodes/node-console-ts-template.git
cd node-console-ts-template
npm install
npm run build
```

After installation and building, the application is ready to run. Running main.js in the build folder with node will start the program. By default the config file will not have a valid app insight token in it so you will have to provide one.

```
npm run start
```

To build the application in production mode

```
npm run build-prod
```

To run the application without NPM (have current directory be the root project folder)

```
node ./build/main.js
```

### Docker

Given that the Docker daemon is running:

```
git clone https://github.com/MitchCodes/node-console-ts-template.git
cd node-console-ts-template
docker build -t my-node-app .
docker run -it my-node-app
```

Replace "my-node-app" with whatever name you would want for your Docker image.


### Kubernetes

If you'd like to run this app in a Kubernetes cluster, the deployment.yaml file can be used to create a deployment. Note that there are parts of the deployment file that you should replace like `<container-name>`. The parts of the file with fields between `{{` and `}}` are examples of fields that contain configuration data that work with [nconf](https://github.com/indexzero/nconf#readme). You can use a release pipeline step to replace these fields with config settings in your release or you can hard-code them in the deployment file (less secure). If you put any sensitive information in the deployment.yaml file directly you should not upload it to any public site, of course.

This deployment.yaml file is very bare-bones and does not handle stuff like volume mounting or networking (such as exposing ports).

---

## Configuration File Setup

There are three optional files that you can create in the root folder next to package.json and the like:
* _config.common.json_
    * Necessary to have if you want to have any config file
* _config.dev.json_
* _config.prod.json_

On build, webpack will take the config.common.json file (if it exists) and merge it with the appropriate dev or prod file (if they exist) depending on whether you built with `npm run build` or `npm run build-prod`. The file that gets generated is named `config.json`. _NOTE:_ It merges arrays by adding them together instead of replacing the entire array. Be careful of this.

Although this repo comes with [nconf](https://github.com/indexzero/nconf), you can obviously use any configuration library you want. The webpack config file merging will happen anyway.

---

## IDE Notes

This was developed using Visual Studio Code.