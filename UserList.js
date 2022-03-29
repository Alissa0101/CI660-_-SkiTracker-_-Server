var User = require('./User.js');
var fs = require('fs');

class UserList{
    constructor(usersFile){
        this.users = [];
        this.usersFile = usersFile;
    }

    /**
    * Adds a new user if they 
    * @param {*} code 
    * @param {*} user 
    */
    addUser(code, user){
        console.log("Adding user: " + code)
        user.code = code;
        this.users[String(code)] = user;
    }


    /**
    * search for a user by their code
    * @param {*} code 
    */
    getUser(code){
        return this.users[String(code)];
    }

    /**
     * Save the users friends to file
     * @param {*} code 
     * @param {*} friends 
     */
    saveUser(code, friends){
        //console.log("code: " + code + " Friends: " + friends);
        if(this.usersFile[code] == undefined){
            this.usersFile[code] = friends;
        }
        let user = this.getUser(code);
        this.usersFile[code] = {'friends': friends, 'name': user.name};
        //console.log("" + this.usersFile)
        fs.writeFileSync('./users.json', JSON.stringify(this.usersFile));
    }


}

module.exports = UserList;