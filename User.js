class User{
    constructor(userList, code, socket, name, testUser=false){
        this.userList = userList;
        this.code = code;
        this.socket = socket;
        this.name = name;
        this.onlineStatus = true;
        this.canBeJoined = false;
        this.friends = [];//list of friends
        this.watching; //the user that they are currently watching
        this.watchedBy = [] // the users that are currently watching this user
        this.isTestUser = testUser;
        //if this is a test user then don't send the confirmation so no socket events happen
        if(testUser == false){
            this.setListeners();
            //the server sends a message to the user telling them everything is working and they can send the device ID.
            socket.emit("confirmConnection", {connected: true});
            //tell friends this user is online
        }
        else{
            this.canBeJoined = true
            //{"time":Date.now(), "lat": 0, "lng": 0, "alt":100}
            var thisObject = this;
            var date = new Date();
            setInterval(function(){
                thisObject.onRecieveNewLocationData({"test":true});
            }, 1000);
        }

    }

    setListeners(){
        this.socket.on("disconnect", this.onDisconnect.bind(this));
        this.socket.on("connect", this.onReconnect.bind(this));
        this.socket.on("recieveDeviceID", this.onRecieveDeviceID.bind(this))
        this.socket.on("requestFriendsStatus", this.onRequestFriendsStatus.bind(this))
        this.socket.on("recieveUpdateName", this.updateName.bind(this))
        this.socket.on("recieveAddFriend", this.onRecieveAddFriend.bind(this))
        this.socket.on("recieveWatchingCode", this.onRecieveWatchingCode.bind(this))
        this.socket.on("recieveCanBeJoined", this.onRecieveCanBeJoined.bind(this))
        this.socket.on("recieveNewLocationData", this.onRecieveNewLocationData.bind(this))
        this.socket.on("recieveStopWatching", this.onRecieveStopWatching.bind(this))
        this.socket.on("watchRequestResponse", this.onWatchRequestResponse.bind(this))
    }


    get online(){
        return this.onlineStatus;
    }

    set online(value){
        this.onlineStatus = value;
        this.updateMyFriendsFriendsList();
    }

    onWatchRequestResponse(data){
        console.log("User: " + this.code + " recieved onWatchRequestResponse: " + data);
        if(data.confirm == true){
            console.log("Watch request was accepted")
            let user = this.userList.getUser(data.code);
            if(user != undefined){
                if(!this.watchedBy.includes(this.code)){
                    user.watching = this.code;
                    this.watchedBy.push(data.code);
                }
            }
        } else{
            console.log("Watch request was denied")
        }
        
    }

    /**
     * Update the canBeJoined status
     * @param {*} data 
     */
    onRecieveCanBeJoined(data){
        console.log("Is User " + this.code + " joinable: " + data);
        this.canBeJoined = data;
    }

    /**
     * Stop watching
     */
    onRecieveStopWatching(){
        console.log(this.code + " stopped watching " + this.watching)
        let user = this.userList.getUser(this.watching);
        if(user != undefined){

            let index = user.watchedBy.indexOf(this.code);
            if (index > -1) {
                user.watchedBy.splice(index, 1);
            }
        }
    }

    /**
     * Recieve the code of the user this wants to start watching
     * send a request to the user asking to be joined
     * @param {*} code 
     */
    onRecieveWatchingCode(code){
        console.log("User " + this.code + " wants to start watching " + code);
        /**this.watching = code;
        let user = this.userList.getUser(code);
        if(user != undefined){
            if(!user.watchedBy.includes(this.code)){
                user.watchedBy.push(this.code);
            }
        }*/
        let user = this.userList.getUser(code);
        if(user != undefined){
            //bypass the watch request and auto accept it
            if(user.isTestUser == true){
                console.log("BYPASS WATCH REQUEST: " + this.code + " to " + code);
                user.onWatchRequestResponse({"name":this.name,"code":this.code, "confirm":true});
            } else {
                user.socket.emit("watchRequest", {'code': this.code, 'name': this.name});
            }
        }
    }

    /**
     * this user has recieved data from the user it is watching
     * @param {*} data 
     */
    onRecieveNewLocationData(data){
        //console.log("Location data by: " + this.code + " For: " + this.watchedBy + " : " + data)
        
        if(data.test == true){

            var options = {hour: 'numeric', minute: 'numeric', second: 'numeric',};
            var date = new Date();

            data.alt = 1000;
            data.lat = date.getSeconds();
            data.lng = date.getMinutes();
            data.time = date.toLocaleDateString("en-US", options);
        }
        //console.log(data.time, data.lat, data.lng, data.alt);
        for(let i = 0; i < this.watchedBy.length; i++){
            let user = this.userList.getUser(this.watchedBy[i]);
            user.socket.emit("recieveLocationData", data);
        }
    }

    /**
     * handle the request to add a new friend
     * @param {*} data 
     */
    onRecieveAddFriend(data){
        let success = false;
        let code = data[0];

        let friend = this.userList.getUser(code);
        if(friend != undefined){
            if(this.hasFriend(code) == false){
                this.addFriend(code);
            }
            success = true;
        }
        this.socket.emit("onRecieveAddFriendSuccessCode", {'success': success})
    }



    /**
     * Add a friend
     * @param {*} code 
     */
    addFriend(code){
        this.friends.push(code);
        this.userList.saveUser(this.code, this.friends);

        //both you and your friend need to have eachother
        let newFriend = this.userList.getUser(code);
        newFriend.friends.push(this.code);
        newFriend.userList.saveUser(code, newFriend.friends);


        //update both friends lists
        this.onRequestFriendsStatus();
        newFriend.onRequestFriendsStatus();

        console.log("User: " + this.code + " Added friend: " + code);
    }

    /**
     * remove a friend
     * @param {*} code 
     */
    removeFriend(code){
        let index = this.friends.indexOf(code);
        if (index > -1) {
            this.friends.splice(index, 1);
        }
        this.userList.saveUser(this.code, this.friends);
    }

    
    updateName(data){
        this.name = data[0]
        console.log("User: " + this.code + " Updated name to " + this.name);

        this.userList.saveUser(this.code, this.friends);

        //update the name other all friends
        this.updateMyFriendsFriendsList();
    }

    /**
     * The user can request a list of user status
     * They send the user code and recieve back the online status for each user
     */
    onRequestFriendsStatus(){
        let userData = {}


        for(let i = 0; i < this.friends.length; i++){
            
            let friendCode = this.friends[i];
            let user = this.userList.getUser(friendCode);
            //this friend is currently in the current userList
            if(user != undefined){
                let status = user.online;
                let data = {
                    'online': status,
                    'name': user.name,
                    'canBeJoined': user.canBeJoined
                }
                userData[friendCode] = data;
            } else if(this.userList.usersFile[friendCode] != undefined){//the friend is not in the current userList but might be in the file
                let user = this.userList.usersFile[friendCode]
                let data = {
                    'online': false,
                    'name': user.name,
                    'canBeJoined': false
                }
                userData[friendCode] = data;
            } else{
                //the user isn't in the current list or in the file so something has gone wrong
                console.log("Cannot find user " + friendCode)
            }
        }
        this.socket.emit("recieveFriendsStatus", userData)
    }

    onDisconnect(){
        console.log("User: " + this.code + " disconnected");
        this.online = false;
    }

    //NOT USED
    onReconnect(){
        console.log("User: " + this.code + " reconnected");
        this.online = true;
    }

    /**
    * The client has sent their device id to the server
    * A unique code is generated from their id and the user is logged in
    * @param {*} data 
    */
    onRecieveDeviceID(data){
        let code = User.generateUserCode(data);
        this.userList.addUser(code, this);
        this.loadFriendsFromFile();
        //send the code to the client to display on their device
        this.socket.emit("onRecieveMyFriendCode", {'code': code, 'name': this.name});

        //update my friends list and all my friends
        this.onRequestFriendsStatus();
        this.updateMyFriendsFriendsList();
    }

    /**
     * Generate the UUID (unique User ID)
     * Will be a 6 char long code based on the deviceID
     */
    static generateUserCode(deviceID){
        let values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
            "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
            "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
        let code = "";
        //032236f7
        let chars = [];
        let combChars = [];
        //get the code values for each character
        for(let i = 0; i < deviceID.length; i++){
            chars.push(deviceID.charCodeAt(i));
        }
        //combine pairs
        combChars[0] = chars[0] + chars[2];
        combChars[1] = chars[1] + chars[3];
        combChars[2] = chars[2] + chars[4];
        combChars[3] = chars[3] + chars[5];
        combChars[4] = chars[4] + chars[6];
        combChars[5] = chars[5] + chars[7];

        for(let i = 0; i < combChars.length; i++){
            code += values[combChars[i]%values.length];
        }

        return code;
    }

    /**
     * Load the users friends from the file
     */
    loadFriendsFromFile(){
        let userData = this.userList.usersFile[this.code];
        if(userData != undefined){
            this.friends = userData.friends;
            this.name = userData.name;
            if(this.friends == undefined){
                this.name = "UNNAMED_ERROR";
                this.friends = [];
            }
        }
        
        console.log("Loaded " + this.code + " friends")
    }

    /**
     * Update all your friends friends list
     * this is ran when the online status is changed so it is updated on all clients
     */
    updateMyFriendsFriendsList(){
        if(this.friends != undefined){
            for(let i = 0; i < this.friends.length; i++){
                let friend = this.userList.getUser(this.friends[i]);
                if(friend != undefined){
                    if(friend.isTestUser == false){
                        //simply run the friendStatus request to send update it 
                        friend.onRequestFriendsStatus();
                    }
                }
            }
        }
    }

    /**
     * check if this user has a friend with this code
     * @param {*} code 
     */
    hasFriend(code){
        for(let i = 0; i < this.friends.length; i++){
            if(this.friends[i] == code){
                return true;
            }
        }
        return false;
    }

}

module.exports = User;