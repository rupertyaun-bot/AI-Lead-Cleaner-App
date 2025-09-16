
const stateMap: Record<string, string> = {
    'new south wales': 'NSW',
    'victoria': 'VIC',
    'queensland': 'QLD',
    'western australia': 'WA',
    'south australia': 'SA',
    'tasmania': 'TAS',
    'australian capital territory': 'ACT',
    'northern territory': 'NT',
    'nsw': 'NSW',
    'vic': 'VIC',
    'qld': 'QLD',
    'wa': 'WA',
    'sa': 'SA',
    'tas': 'TAS',
    'act': 'ACT',
    'nt': 'NT'
};

export const abbreviateState = (stateName: string): string => {
    if (!stateName) return '';
    const lowerState = stateName.trim().toLowerCase();
    return stateMap[lowerState] || stateName.toUpperCase(); // Return uppercase original if not found
};
