import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import requests
from pymongo import MongoClient

def scraper():
    #
    ## Gather country data, including longitude and latitude -----------
    #
    # Scrape table containing longitude and latitudes of countries and 
    # bring into pandas
    long_lat=pd.read_html("https://developers.google.com/public-data/docs/canonical/countries_csv",skiprows=1)[0]
    # renaming columns
    long_lat.columns = ['country_code', 'latitude','longitude','name']

    # Scrape country codes from another table
    converting_country_code = pd.read_html("https://www.worldatlas.com/aatlas/ctycodes.htm", skiprows=1)[0]
    converting_country_code.columns = ['name','country_code_2','country_code_3','x','y']
    converting_country_code = converting_country_code.drop(['x', 'y'], axis=1)
    # merge code and lat/long tables
    merged_col = pd.merge(converting_country_code, long_lat, left_on = 'country_code_2',right_on="country_code",how="inner")
    # drop excess columns
    merged_col=merged_col.drop(['name_y','country_code','country_code_2'], axis=1)
    # renaming columns
    merged_col.columns = ['country','country_code','latitude','longitude']

    # Accessing WHO country list to narrow lat/longs to relevent names
    country_r = requests.get("http://apps.who.int/gho/athena/api/COUNTRY?format=json").json()
    # pull rows of country data from json
    who_country_list=[]
    country_code = country_r['dimension'][0]['code']
    for country in country_code:
        who_country_list.append(country["label"])
    # make rows into dataframe
    who_df = pd.DataFrame(who_country_list)
    who_df.columns = ["who_country"]

    # inner join WHO countries to constrain to those that will have data
    who_and_others = pd.merge(merged_col, who_df, left_on='country_code',right_on="who_country",how="inner")
    who_and_others = who_and_others.drop(['who_country'], axis=1)
    #
    ## Gather WHO disease instance data --------------------------------
    #
    # establish loop parameters for disease instance queries
    url_before = "http://apps.who.int/gho/athena/data/GHO/"
    url_after = "?format=html&filter=COUNTRY:*"
    # WHO codes correspond to data that gives instances of diseases by country
    code_list = ["WHS3_48", "WHS3_50", "WHS3_45"]
    disease_list = ["Malaria", "Yellow Fever", "Leprosy"]
    # access WHO data for each disease and add to 'dfs' list
    dfs = []
    for code, disease in zip(code_list, disease_list):
        url = url_before + code + url_after
        raw_df = pd.read_html(url)[0]
        df = raw_df.loc[:, ['YEAR', 'COUNTRY', 'NUMERIC VALUE']]
        df['DISEASE'] = disease
        dfs.append(df)
    # make master df out of disease dfs
    disease_df = pd.concat(dfs)
    # lowercase columns, rename NUMERIC VALUE -> instances
    disease_df.columns = ['year', 'country', 'instances', 'disease']
    # fill NaN values in 'instances' column, as they correspond to missing data and this will ignore those cells during analysis.
    disease_df["instances"] = disease_df["instances"].fillna(0)
    # make df with latitudes and disease instance information
    disease_lat = pd.merge(disease_df, who_and_others[['country', 'latitude']], on='country')
    #
    ## Scrape temperature data from NOAA -------------------------------
    #
    temp_data_url = "https://www.ncdc.noaa.gov/cag/global/time-series/globe/land_ocean/12/9/1980-2019"
    temp_data_df = pd.read_html(temp_data_url)[0]
    # drop unnecessary column
    temp_data_df = temp_data_df.drop(['Rank'], axis=1)
    # cast temperature strings to floats
    temp_data_df.loc[:,"Anomaly(1901-2000 Base Period)"] = temp_data_df["Anomaly(1901-2000 Base Period)"].str.replace("°C","")
    temp_data_df["Anomaly(1901-2000 Base Period)"] = pd.to_numeric(temp_data_df["Anomaly(1901-2000 Base Period)"])
    # data is initiall normalized against 1900-2001 average temp per docs, renormalizing against minimum value in set (1980-2018)
    temp_data_df["Normalized Temp"] = temp_data_df["Anomaly(1901-2000 Base Period)"] - temp_data_df["Anomaly(1901-2000 Base Period)"].min()
    #
    ## Make JSON formatted data and upload to mongoDB ------------------
    #
    # make years list to iterate over
    years = list(temp_data_df['Year'])
    # make dict of one list to upload to mongo
    JSON = {
        'data':[]
    }
    # limit to 1980-2016 to match yellow fever data
    for year in years[:-2]:
        # initialize dict to add info for each year
        document = {}
        # add temp
        document['temp'] = temp_data_df.loc[
            temp_data_df['Year'] == year, 
            ['Normalized Temp']
        ].values[0][0]
        # add year
        document['year'] = year
        # add disease list, to which disease dicts will be added
        document['disease'] = []
        # iterate over diseases in the dataframe
        for disease in disease_lat['disease'].unique():
            disease_dict = {}
            # check that there is info for a given disease for that year
            if not disease_lat.loc[(disease_lat['disease'] == disease) &
                                (disease_lat['year'] == year) &
                                (disease_lat['instances'] > 2), 
                                :].empty:
                # if there is info, query min and max latitude of spread for that year
                try:
                    max_lat = disease_lat.loc[(disease_lat['disease'] == disease) &
                                          (disease_lat['year'] == year) &
                                          (disease_lat['instances'] > 2), 
                                          :]['latitude'].max()
                    min_lat = disease_lat.loc[(disease_lat['disease'] == disease) &
                                          (disease_lat['year'] == year) &
                                          (disease_lat['instances'] > 2), 
                                          :]['latitude'].min()
                    disease_dict['name'] = disease
                    disease_dict['max_lat'] = max_lat
                    disease_dict['min_lat'] = min_lat
                    # add disease info to list for that year
                    document['disease'].append(disease_dict)
                except:
                    pass
        # add each year's dictionary to overall list
        JSON['data'].append(document)

    # initiate mongo connection
    client = MongoClient()
    # make/connect to db
    db = client['disease_db']
    # establish collection object
    collection = db.disease_collection
    # upsert json to collection
    collection.update({}, JSON, upsert=True)
    print(JSON)