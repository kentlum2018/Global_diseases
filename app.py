from flask import Flask, render_template, redirect, jsonify
from flask_pymongo import PyMongo
from scraper import scraper

app = Flask(__name__)

# make client
mongo = PyMongo(app, uri="mongodb://localhost:27017/disease_db")

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/data')
def data():
    query = mongo.db.disease_collection.find_one()
    # if query exists, show, else redirect to scraper
    if query:
        return jsonify({'type':query['type'], 'features':query['features']})
    else:
        return redirect('/scraper', code=302)
    

@app.route('/scraper')
def scraperurl():
    # collect dict results from scraper
    JSON = scraper()
    # establish collection object
    collection = mongo.db.disease_collection
    # upsert json to collection
    collection.update({}, JSON, upsert=True)
    return redirect('/data', code=302)


if __name__ == "__main__":
    app.run(debug=True)