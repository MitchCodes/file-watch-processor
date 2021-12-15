FROM node:16.6

###################################################
#### Dependency packages layer
###################################################


RUN su -c 'apt-get update' && su -c 'apt-get install --force-yes -y sudo' && su -c 'apt-get install --force-yes -y build-essential'



###################################################
#### Node.JS Application Layer 
###################################################

# Create the app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json ./

RUN sudo npm install

# Bundle app source
COPY . .

RUN sudo npm run build-prod

# Any ports to expose
# EXPOSE 43218:43218

CMD [ "npm", "run-script", "start" ]