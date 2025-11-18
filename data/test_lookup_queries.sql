-- Test queries to verify lookup table works with your taxi data

-- Test 1: List all available zones
SELECT LocationID, Borough, Zone, ServiceArea 
FROM taxi_zone_lookup 
ORDER BY Borough, Zone;

-- Test 2: Find JFK Airport
SELECT * FROM taxi_zone_lookup WHERE Zone LIKE '%JFK%';

-- Test 3: Count trips by pickup borough (requires JOIN with main table)
SELECT 
    pu.Borough,
    COUNT(*) as trip_count,
    AVG(t.fare_amount) as avg_fare
FROM green_taxi_trips t
JOIN taxi_zone_lookup pu ON t.PULocationID = pu.LocationID
GROUP BY pu.Borough
ORDER BY trip_count DESC;

-- Test 4: Airport trips with human-readable names
SELECT 
    pu.Zone as pickup_zone,
    do.Zone as dropoff_zone,
    AVG(t.fare_amount) as avg_fare,
    AVG(t.trip_distance) as avg_distance,
    COUNT(*) as trips
FROM green_taxi_trips t
JOIN taxi_zone_lookup pu ON t.PULocationID = pu.LocationID
JOIN taxi_zone_lookup do ON t.DOLocationID = do.LocationID
WHERE pu.ServiceArea = 'Airports' OR do.ServiceArea = 'Airports'
GROUP BY pu.Zone, do.Zone
ORDER BY trips DESC
LIMIT 10;

-- Test 5: Popular Manhattan routes
SELECT 
    pu.Zone as from_zone,
    do.Zone as to_zone,
    COUNT(*) as trips,
    AVG(t.fare_amount) as avg_fare
FROM green_taxi_trips t
JOIN taxi_zone_lookup pu ON t.PULocationID = pu.LocationID
JOIN taxi_zone_lookup do ON t.DOLocationID = do.LocationID
WHERE pu.Borough = 'Manhattan' AND do.Borough = 'Manhattan'
GROUP BY pu.Zone, do.Zone
ORDER BY trips DESC
LIMIT 10;
