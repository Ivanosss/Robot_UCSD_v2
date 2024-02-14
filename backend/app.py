from flask import Flask, jsonify, request, send_file
from pymongo import MongoClient
import datetime as dt
from datetime import datetime
import bson
from bson.objectid import ObjectId
from bson.json_util import loads
import yaml
import os
from dotenv import load_dotenv
from io import BytesIO

# The app serves as the publisher for the ROS nodes communication
# import talker

# Main app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Connect to MONGO CLIENT (CLOUD LEVEL - for development only)
load_dotenv() # Load .env file containing credentials
user = os.getenv("MONGO_USR")
password = os.getenv("password")

# Access to database containing all data
client = MongoClient(f"mongodb+srv://{user}:{password}@robot-ucsd.oqmkaj6.mongodb.net", tls=True, tlsAllowInvalidCertificates=True) 
db = client["ROBOT-UCSD"]

facial_expressions = db["facial_expressions"] # Creation/Access of table Expressions
body_gestures = db["body_gestures"]  # Creation/Access of table Movements

# TODO: Esta es la de sounds (incluye la entrada de Hum)
sounds = db["tones_of_voice"] # Creation/Access of table Tones of Voice

# TODO: Esta es la de talk (tabla/coleccion con un solo elemento)
verbal = db["speech_elements"]  # Creation/Access of table Speech

# TODO: Esta es la de actions (copiar y pegar la de routines) y cambiar el nombre del array
routines = db["routines"]  # Creation/Access of table Routines

# Connect to MONGO CLIENT (LOCAL LEVEL)
# client = MongoClient("127.0.0.1", 27017)
# local_db = client["ROBOT_UCSD_LOCAL"]  # Access to data base containing the routines created locally
# admin_db = client["ROBOT_UCSD_ADMIN"]  # Access to data base containing behavior blocks data

# body_gestures = admin_db["body_gestures"]  # Access to Body Gestures collection
# facial_expressions = admin_db["facial_expressions"] # Access to Facial Expressions collection
# verbal = admin_db["verbal"] # Access to Verbal collection
# sounds = admin_db["sounds"]  # Access to Sounds collection
# routines = local_db["routines"]  # Access of Routines collections

# Main app
@app.route("/", methods=["GET"])
def root():
    return "Welcome to Robot UCSD app."


@app.route("/fetch_collections_from_db", methods=["GET"])
def fetch_from_db():
    try:
        # Fetch documents from all collections in the admin database
        # to send to the sidebar angular component
        data = [] # Array to store the arrays containing the contents of each collection (array of arrays)

        facial_expressions_entries = []
        for entry in facial_expressions.find():
            facial_expressions_entries.append({"id": str(entry["_id"]), "label": entry["expression_name"],
                                              "level": 0, "description": entry["description"], "id_in_robot": entry["id_in_robot"]})

        data.append(facial_expressions_entries)

        body_gestures_entries = []
        for entry in body_gestures.find():
            body_gestures_entries.append({"id": str(
                entry["_id"]), "label": entry["movement_name"], "description": entry["description"], "id_in_robot": entry["id_in_robot"]})

        data.append(body_gestures_entries)

        sounds_entries = []
        for entry in sounds.find():
            sounds_entries.append({"id": str(
                entry["_id"]), "label": entry["tone_name"], "description": entry["description"], "id_in_robot": entry["id_in_robot"]})

        data.append(sounds_entries)

        verbal_entries = []
        for entry in verbal.find():
            verbal_entries.append({"id": str(entry["_id"]), "label": entry["element_name"],
                                           "description": entry["description"], "id_in_robot": entry["id_in_robot"], "utterance": entry["utterance"]})

        data.append(verbal_entries)

        # Fetch documents from the routines collections in the local database
        # to send to the sidebar angular component
        routines_entries = []
        for entry in routines.find():
            routines_entries.append({"id": str(entry["_id"]), "label": entry["label"], "user": entry["user"],
                                    "last_modified": entry["last_modified"], "file": bson.decode(entry["file"])})

        data.append(routines_entries)

        # Return array in JSON format
        return jsonify(data)
    except Exception as e:
        # Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})


@app.route("/save_routine/<replace>", methods=["POST"])
def save_routine(replace):
    # Receive POST request from ionic app containing the
    # JSON data of a routine
    if request.method == 'POST':
        routine = loads(request.data)
        print(replace)
        try:
            # Look for the given name for the routine in the localdatabase, if not found, insert routine
            # as a new document
            if (routines.find_one({"label": routine["routine"]["name"]})) is None:
                db_routine = {}

                db_routine["user"] = "TESTUSER"
                db_routine["label"] = routine["routine"]["name"]

                file = {}

                for i in range(0, len(routine["routine"]["array_block"])):
                    file["Line_" + str(i+1)] = routine["routine"]["array_block"][i]

                db_routine["file"] = bson.encode(file)
                db_routine["last_modified"] = datetime.now(tz=dt.timezone.utc)

                routines.insert_one(db_routine)

                # Return response in JSON format
                return jsonify({"Status" : "Insert completed", "Code" : 0})
        
            # If routine name is found and the user indicates that they want to update the existing 
            # routine, replace it with the updated fields
            elif (routines.find_one({"label": routine["routine"]["name"]})) is not None and replace == "1": 
                query = {"label" : routine["routine"]["name"]}
                new_data = {} 

                file = {}

                for i in range(0, len(routine["routine"]["array_block"])):
                    file["Line_" + str(i+1)] = routine["routine"]["array_block"][i]
                
                new_data["file"] = bson.encode(file)
                new_data["last_modified"] = datetime.now(tz=dt.timezone.utc)

                routines.update_one(query, {"$set" : new_data})

                # Return response in JSON format
                return jsonify({"Status" : "Replace completed", "Code" : 0})
            
            # If routine name is found, alert the user a routine with the given name already
            # exists
            elif (routines.find_one({"label": routine["routine"]["name"]})) is not None:
                # Return response in JSON format
                return jsonify({"Status" : "Routine already exists", "Code" : 1})
        except Exception as e:
            # Handle exception
            return jsonify({"Status" : "An error ocurred: " + str(e)})


@app.route("/download_routine/<id>", methods=["GET"])
def download_routine(id):
    try:
        # Find the routine document the user wants to download 
        routine = routines.find_one({"_id": ObjectId(id)})

        # Get the BSON file from the document and decode it
        routine = bson.decode(routine["file"])

        # Transform file to YAML format
        routine = yaml.dump(routine)

        # Return encoded YAML string
        return routine.encode()
    except Exception as e:
        # Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})


# regresar como array de arrays (asi como lo manda ionic)
@app.route("/recent_routine", methods=["GET"])
def get_most_recent_routine():
    try:
        # Retrieve most recent routine
        data = []
        struct = [] # Array of arrays containing the structure of the behavior blocks on the routine

        # Find most recent routine in database and decode it
        recent = routines.find_one(sort=[('last_modified', -1)])        
        name = recent["label"]
        data.append([name])

        recent = bson.decode(recent["file"])

        # Append the arrays of behavior blocks,
        # each array corresponding to the number of line 
        # they were originally placed in
        for k, v in recent.items():
            struct.append(v)
        
        data.append(struct)

        # Return response in JSON format
        return jsonify(data)
    except Exception as e:
        # Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})



@app.route("/delete_routine/<id>", methods=["DELETE"])
def delete_routine(id):
    try:
        # Find by name the routine the user wants to delete
        # and delete it
        if (routines.find_one({"_id": ObjectId(id)})) is not None:
            routines.delete_one({"_id": ObjectId(id)})

             # Return response in JSON format
            return jsonify({"Status" : "Delete completed"})
        else:
            # If the given routine name isnt found in the database
             # Return response in JSON format
            return jsonify({"Status" : "No such routine found"})
    except Exception as e:
        # Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})


@app.route("/load_current_routine_txt", methods=["GET"])
def load_current_routine_txt():
    try:
        # Request to give YAML preview of current routine
        # was received correctly
        # Return response in JSON format 
        return jsonify({"Status": "Complete"})
    except Exception as e:
        # Handle exception
        return jsonify({"Status": e})


@app.route("/fetch_routines_from_db", methods=["GET"])
def fetch_routines_from_db():
    try:
        # Refresh of Routines collection
        routines = db["routines"]
        data = [] # Array to store all contents in the collection

        # Get all documents found in the collection
        # Provide front end with only ID and label
        routines_entries = []
        for entry in routines.find():
            routines_entries.append({"id": str(entry["_id"]), "label": entry["label"]})
        data.append(routines_entries)

        # Return array in JSON format
        return jsonify(data)
    except Exception as e:
        #Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})
    
@app.route("/fetch_routine_from_db/<name>", methods=["GET"])
def fetch_routine_from_db(name):
    try:
        # Refresh of Routines collections
        # TODO: Esta es la de actions (copiar y pegar la de routines) y cambiar el nombre del array
        routines = db["routines"]

        # Get specific routine
        # Get BSON file that contains the
        # data of the blocks that make up the routine
        routine = routines.find_one({"label": name})
        routine = bson.decode(routine["file"])
        
        # Append all data to array
        struct = []
        for k, v in routine.items():
            struct.append(v)
            
        # Return array in JSON format
        return jsonify(struct)
    except Exception as e:
        #Handle exception
        return jsonify({"Status" : "An error ocurred: " + str(e)})

# @app.route("/start_ros_talker", methods=["GET"])
# def start_ros_nodes():
#     # Start the script that executes the ROS
#     # node that sends data to the ROS listener node 
#     while True:
#         talker.main()



if __name__ == "__main__":
    app.run(debug=True)
