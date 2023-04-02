//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  autoIndex: false, // Don't build indexes
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
}

mongoose.connect("mongodb://localhost:27017/todolistDB", options)
.then(console.log("DataBase is connected"))
  .catch((err) => console.log(err));


  const extensionSchema = new mongoose.Schema({
    
    taxName: {
      type: String,
      unique: true,
      required: true
    },
    taxValue: {
      type: Number,
      required: true
    }

  });
  
  const Extension = mongoose.model('Extension', extensionSchema);



const itemsSchema = {
  name: String,
  time: String,
  time2:String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];


const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get('/', function(req, res){
    res.sendFile(__dirname+"/public/home.html");

});

app.post('/', function(req, res){
    res.redirect('/create');
});

app.get("/create", function(req, res) {
  Item.find({}, function(err, foundItems){
    if (err) {
      console.log(err);
    } else {
      if (foundItems.length === 0) {
        Item.insertMany(defaultItems, function(err){
          if (err) {
            console.log(err);
          } else {
            console.log("Successfully saved default items to DB.");
          }
        });
        res.redirect("/create");
      } else {
        res.render("list", {listTitle: "Today", newListItems: foundItems});
      }
    }
  });
});


app.get("/:customListName", function(req, res){
  const customListName = _.capitalize(req.params.customListName);


  List.findOne({name: customListName}, function(err, foundList){
    if (!err){
      if (!foundList){
        //Create a new list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        List.deleteMany(({ name: "Favicon.ico"}),function(err){
          console.log(err);
          console.log("Data Deleted");
    });
        res.redirect("/" + customListName);
      } else {
        //Show an existing list

        res.render("list", {listTitle: foundList.name, newListItems: foundList.items });
      }
    }
  });


});

app.post("/create", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;
  const timeName1=req.body.newTime1;
  const timeName2=req.body.newTime2;

  // console.log(createNewListName);
  
  // res.render("list",{listTitle: createNewListName, newListItems: createNewListName.items});

  const item = new Item({
    name: itemName,
    time: timeName1,
    time2:timeName2
  });

  if (listName === "Today"){
    item.save();
    res.redirect("/create");
  } else {
    List.findOne({name: listName}, function(err, foundList){
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});


app.post("/customroute", function(req, res){
    const createNewListName='/'+req.body.newListInput;
    if(createNewListName=="Favicon.ico"){
      console.log("Favicon");
      res.redirect(Today);
    }
    else
    res.redirect(createNewListName);
});



app.post("/delete", function(req, res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId, function(err){
      if (!err) {
        console.log("Successfully deleted checked item.");
        res.redirect("/create");
      }
    });
  } else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      if (!err){
        res.redirect("/" + listName);
      }
    });
  }


});



// Code for show database in table formate


app.get("/showList/db", async (req, res) => {

  List.find({},function(err, listsArray){
    res.render("Table.ejs", {mainLists: listsArray});
  });
   // Render the 'all' EJS template and pass the items and lists data
});

app.post("/ShowList/db",function(req,res){
    res.redirect("/showList/db");
});

// end table formate

app.get("/about", function(req, res){
  res.render("about");
});

app.post('/AddExtension/Extension', async (req, res) => {

    const { taxName, taxValue } = req.body;
    if(taxName==="" || !taxValue){
      console.log("Null value not allowed");
      res.redirect("/AddExtension/Extension");
      return;
    }
    Extension.findOneAndUpdate({ taxName: taxName }, { taxValue: taxValue }, { new: true, upsert: true }, (err, data)=> {
      if (err) {
        console.log('Error:', err);
      } else {
        console.log('value added:', data);
      }
    });

    res.redirect('/AddExtension/Extension'); // Redirect to home page or any other page after successful save
 
});

app.get("/AddExtension/Extension", (req, res) => {
  res.render("AddExtension.ejs");
});




app.get('/extension/showall', async (req, res) => {
  try {
    // Retrieve all extensions from the database
    const extensions = await Extension.find();

    // Render the extensions view with the list of extensions
    res.render('showExtensions', { extensions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.get("/extension/edit", async (req, res) => {
  const extensions = await Extension.find();
  res.render('editExtensions', {extensions: extensions});
});


app.post("/extension/edit", async (req, res) => {

      if(req.body.taxName==="" || !req.body.taxValue){
        console.log("Null value not allowed");
        res.redirect("/AddExtension/Extension");
        return;
      }
        const change = {
          taxName: req.body.taxName,
          taxValue: req.body.taxValue,
        };
        Extension.findOneAndUpdate(
          { _id: req.body.taxID },
          change,
          (err, data) => {
            if (err) {
              console.log(err);
              res.send("failure");
            } else {
              res.send("success");
              console.log("Data updated!");
            }
          }
        );
      
    });

app.post("/extension/delete", (req, res) => {
  Extension.deleteOne({ _id: req.body._ID }, function (err, data) {
    if (err) {
      console.log(err);
      res.redirect("/failure");
    } else {
      res.redirect("/extension/showall");
    }
  });
});





app.listen(5001, function() {
  console.log("Server started on port 5001");
});
