export interface Landmark {
    description: string;
    name: string;
    scientificName: string;
    path: string;
    howToFind: string;
}

export interface LandmarkCollection {
    [key: string]: Landmark;
}

export const frontProfileLandmarks: LandmarkCollection = {
    hairline: {
        description:
            'The hairline represents the junction between the scalp and forehead skin. Located at the highest point of the forehead where hair growth begins.',
        name: 'Hairline',
        scientificName: 'Trichion (frontal view)',
        path: 'landmarksFront/hairline',
        howToFind: 'Identify the highest point of the frontal hairline in the middle of the forehead.',
    },
    leftTemple: {
        description:
            'The left temporal region landmark, located at the side of the forehead above the eyebrow.',
        name: 'Left Temple',
        scientificName: 'Left Temporal Point',
        path: 'landmarksFront/leftTemple',
        howToFind:
            'Mark the widest point of the hairline on the left side, halfway between the hairline and eyebrow.',
    },
    rightTemple: {
        description:
            'The right temporal region landmark, located at the side of the forehead above the eyebrow.',
        name: 'Right Temple',
        scientificName: 'Right Temporal Point',
        path: 'landmarksFront/rightTemple',
        howToFind:
            'Mark the widest point of the hairline on the right side, halfway between the hairline and eyebrow.',
    },
    leftOuterEar: {
        description: 'The outermost point of the left ear attachment to the head.',
        name: 'Left Outer Ear',
        scientificName: 'Left Auricular Lateral Point',
        path: 'landmarksFront/leftOuterEar',
        howToFind: 'Locate the most protruded point of the left ear on the side of the head.',
    },
    rightOuterEar: {
        description: 'The outermost point of the right ear attachment to the head.',
        name: 'Right Outer Ear',
        scientificName: 'Right Auricular Lateral Point',
        path: 'landmarksFront/rightOuterEar',
        howToFind: 'Locate the most protruded point of the right ear on the side of the head.',
    },
    leftBrowHead: {
        description: 'The starting point of the left eyebrow, closest to the nose.',
        name: 'Left Brow Head',
        scientificName: 'Left Supercilium Medialis',
        path: 'landmarksFront/leftBrowHead',
        howToFind:
            'Locate the innermost and highest point of the left eyebrow, at the edge where brow hairs end.',
    },
    leftBrowInnerCorner: {
        description: 'The inner corner point of the left eyebrow area.',
        name: 'Left Brow Inner Corner',
        scientificName: 'Left Supercilium Medial Corner',
        path: 'landmarksFront/leftBrowInnerCorner',
        howToFind: 'Locate the lowest point at the inner edge of the left eyebrow, where brow hairs end.',
    },
    leftBrowArch: {
        description: 'The highest point of the left eyebrow arch.',
        name: 'Left Brow Arch',
        scientificName: 'Left Supercilium Superior',
        path: 'landmarksFront/leftBrowArch',
        howToFind:
            'Find the highest point along the lower side of the left eyebrow, where the brow reaches its peak.',
    },
    leftBrowPeak: {
        description: 'The peak point of the left eyebrow, often the most prominent part of the arch.',
        name: 'Left Brow Peak',
        scientificName: 'Left Supercilium Apex',
        path: 'landmarksFront/leftBrowPeak',
        howToFind:
            'Identify the most elevated point along the top of the left eyebrow, which may be slightly to the right or left of the arch.',
    },
    rightBrowHead: {
        description: 'The starting point of the right eyebrow, closest to the nose.',
        name: 'Right Brow Head',
        scientificName: 'Right Supercilium Medialis',
        path: 'landmarksFront/rightBrowHead',
        howToFind:
            'Locate the innermost and highest point of the right eyebrow, at the edge where brow hairs end.',
    },
    rightBrowInnerCorner: {
        description: 'The inner corner point of the right eyebrow area.',
        name: 'Right Brow Inner Corner',
        scientificName: 'Right Supercilium Medial Corner',
        path: 'landmarksFront/rightBrowInnerCorner',
        howToFind: 'Locate the lowest point at the inner edge of the right eyebrow, where brow hairs end.',
    },
    rightBrowArch: {
        description: 'The highest point of the right eyebrow arch.',
        name: 'Right Brow Arch',
        scientificName: 'Right Supercilium Superior',
        path: 'landmarksFront/rightBrowArch',
        howToFind:
            'Find the highest point along the lower side of the right eyebrow, where the brow reaches its peak.',
    },
    rightBrowPeak: {
        description: 'The peak point of the right eyebrow, often the most prominent part of the arch.',
        name: 'Right Brow Peak',
        scientificName: 'Right Supercilium Apex',
        path: 'landmarksFront/rightBrowPeak',
        howToFind:
            'Identify the most elevated point along the top of the right eyebrow, which may be slightly to the right or left of the arch.',
    },
    leftBrowTail: {
        description: "The outer endpoint of the left eyebrow, closest to the cheekbone.",
        name: "Left Brow Tail",
        scientificName: "Left Supercilium Lateralis",
        path: "landmarksFront/leftBrowTail",
        howToFind: "Locate the outermost point of the left eyebrow where the brow hairs taper off toward the temple."
    },
    rightBrowTail: {
        description: "The outer endpoint of the right eyebrow, closest to the cheekbone.",
        name: "Right Brow Tail",
        scientificName: "Right Supercilium Lateralis",
        path: "landmarksFront/rightBrowTail",
        howToFind: "Locate the outermost point of the right eyebrow where the brow hairs taper off toward the temple."
    },
    leftEyeMedialCanthus: {
        description: 'The inner corner of the left eye where the upper and lower eyelids meet.',
        name: 'Left Medial Canthus',
        scientificName: 'Left Canthus Medialis',
        path: 'landmarksFront/leftEyeMedialCanthus',
        howToFind: 'Locate the inner corner of the left eye.',
    },
    leftEyeLateralCanthus: {
        description: 'The outer corner of the left eye where the upper and lower eyelids meet.',
        name: 'Left Lateral Canthus',
        scientificName: 'Left Canthus Lateralis',
        path: 'landmarksFront/leftEyeLateralCanthus',
        howToFind: 'Locate the outer corner of the left eye where the eyelids meet.',
    },
    leftEyePupil: {
        description: "The center of the left eye's pupil.",
        name: 'Left Pupil',
        scientificName: 'Left Pupilla',
        path: 'landmarksFront/leftEyePupil',
        howToFind: "Mark the center of the left eye's pupil.",
    },
    leftEyeUpperEyelid: {
        description: 'The highest point of the left upper eyelid.',
        name: 'Left Upper Eyelid',
        scientificName: 'Left Palpebra Superior',
        path: 'landmarksFront/leftEyeUpperEyelid',
        howToFind: 'Identify the highest point of the left upper eyelid, above the iris.',
    },
    leftEyeLowerEyelid: {
        description: 'The lowest point of the left lower eyelid.',
        name: 'Left Lower Eyelid',
        scientificName: 'Left Palpebra Inferior',
        path: 'landmarksFront/leftEyeLowerEyelid',
        howToFind: 'Identify the lowest point of the left lower eyelid, below the iris.',
    },
    leftEyelidHoodEnd: {
        description: 'The lateral end of the left upper eyelid fold where hooding is assessed.',
        name: 'Left Eyelid Hood End',
        scientificName: 'Left Sulcus Palpebralis Lateralis',
        path: 'landmarksFront/leftEyelidHoodEnd',
        howToFind:
            'Locate the outer end of the left upper eyelid fold, just outside the outer corner of the eye.',
    },
    leftUpperEyelidCrease: {
        description: "The crease line of the left upper eyelid where the eyelid folds when the eye is open.",
        name: "Left Upper Eyelid Crease",
        scientificName: "Left Pretarsal Skin Crease",
        path: "landmarksFront/leftUpperEyelidCrease",
        howToFind: "Locate the horizontal fold line on the left upper eyelid, visible when the eye is open, above the lash line. This may be directly in-line with the upper eyelid point if there is no visible upper eyelid exposure"
    },
    rightEyeMedialCanthus: {
        description: 'The inner corner of the right eye where the upper and lower eyelids meet.',
        name: 'Right Medial Canthus',
        scientificName: 'Right Canthus Medialis',
        path: 'landmarksFront/rightEyeMedialCanthus',
        howToFind: 'Locate the inner corner of the right eye.',
    },
    rightEyeLateralCanthus: {
        description: 'The outer corner of the right eye where the upper and lower eyelids meet.',
        name: 'Right Lateral Canthus',
        scientificName: 'Right Canthus Lateralis',
        path: 'landmarksFront/rightEyeLateralCanthus',
        howToFind: 'Locate the outer corner of the right eye where the eyelids meet.',
    },
    rightEyePupil: {
        description: "The center of the right eye's pupil.",
        name: 'Right Pupil',
        scientificName: 'Right Pupilla',
        path: 'landmarksFront/rightEyePupil',
        howToFind: "Mark the center of the right eye's pupil.",
    },
    rightEyeUpperEyelid: {
        description: 'The highest point of the right upper eyelid.',
        name: 'Right Upper Eyelid',
        scientificName: 'Right Palpebra Superior',
        path: 'landmarksFront/rightEyeUpperEyelid',
        howToFind: 'Identify the highest point of the right upper eyelid, above the iris.',
    },
    rightEyeLowerEyelid: {
        description: 'The lowest point of the right lower eyelid.',
        name: 'Right Lower Eyelid',
        scientificName: 'Right Palpebra Inferior',
        path: 'landmarksFront/rightEyeLowerEyelid',
        howToFind: 'Identify the lowest point of the right lower eyelid, below the iris.',
    },
    rightEyelidHoodEnd: {
        description: 'The lateral end of the right upper eyelid fold where hooding is assessed.',
        name: 'Right Eyelid Hood End',
        scientificName: 'Right Sulcus Palpebralis Lateralis',
        path: 'landmarksFront/rightEyelidHoodEnd',
        howToFind:
            'Locate the outer end of the right upper eyelid fold, just outside the outer corner of the eye.',
    },
    rightUpperEyelidCrease: {
        description: "The crease line of the right upper eyelid where the eyelid folds when the eye is open.",
        name: "Right Upper Eyelid Crease",
        scientificName: "Right Pretarsal Skin Crease",
        path: "landmarksFront/rightUpperEyelidCrease",
        howToFind: "Locate the horizontal fold line on the right upper eyelid, visible when the eye is open, above the lash line. This may be directly in-line with the upper eyelid point if there is no visible upper eyelid exposure"
    },
    noseLeft: {
        description: 'The left side of the nose at its widest point.',
        name: 'Left Nose Side',
        scientificName: 'Left Ala Nasi',
        path: 'landmarksFront/noseLeft',
        howToFind: 'Mark the leftmost point of the nose at the widest part of the nostrils.',
    },
    noseRight: {
        description: 'The right side of the nose at its widest point.',
        name: 'Right Nose Side',
        scientificName: 'Right Ala Nasi',
        path: 'landmarksFront/noseRight',
        howToFind: 'Mark the rightmost point of the nose at the widest part of the nostrils.',
    },
    leftNoseBridge: {
        description: "The left edge of the nasal bridge.",
        name: "Left Nose Bridge",
        scientificName: "Left Dorsum Nasi",
        path: "landmarksFront/leftNoseBridge",
        howToFind: "Locate the left edge of the nose bridge, where it transitions from the nasal bone to the facial skin, typically around the middle of the nose."
    },
    rightNoseBridge: {
        description: "The right edge of the nasal bridge.",
        name: "Right Nose Bridge",
        scientificName: "Right Dorsum Nasi",
        path: "landmarksFront/rightNoseBridge",
        howToFind: "Locate the right edge of the nose bridge, where it transitions from the nasal bone to the facial skin, typically around the middle of the nose."
    },
    nasalBase: {
        description: 'The base of the nose.',
        name: 'Nasal Base',
        scientificName: 'Nasal Base',
        path: 'landmarksFront/nasalBase',
        howToFind:
            'Locate the base of the nose where the lower nostril ends, typically to the right of the nose tip.',
    },
    noseBottom: {
        description: 'The bottom point of the nose between the nostrils.',
        name: 'Nose Bottom',
        scientificName: 'Subnasale',
        path: 'landmarksFront/noseBottom',
        howToFind: 'Locate the lowest point of the nose tip around the middle of the nose.',
    },
    leftCheek: {
        description: 'The most prominent point of the left cheekbone.',
        name: 'Left Cheekbone',
        scientificName: 'Left Zygion',
        path: 'landmarksFront/leftCheek',
        howToFind:
            'Locate the most laterally prominent point of the left cheekbone, typically the widest part of the midface.',
    },
    rightCheek: {
        description: 'The most prominent point of the right cheekbone.',
        name: 'Right Cheekbone',
        scientificName: 'Right Zygion',
        path: 'landmarksFront/rightCheek',
        howToFind:
            'Locate the most laterally prominent point of the right cheekbone, typically the widest part of the midface.',
    },
    mouthLeft: {
        description: 'The left corner of the mouth where the lips meet.',
        name: 'Left Mouth Corner',
        scientificName: 'Left Cheilion',
        path: 'landmarksFront/mouthLeft',
        howToFind: 'Mark the leftmost corner of the mouth, where the lip border ends.',
    },
    mouthRight: {
        description: 'The right corner of the mouth where the lips meet.',
        name: 'Right Mouth Corner',
        scientificName: 'Right Cheilion',
        path: 'landmarksFront/mouthRight',
        howToFind: 'Mark the rightmost corner of the mouth, where the lip border ends.',
    },
    cupidsBow: {
        description: "The center peak of the upper lip, forming the characteristic 'cupid's bow' shape.",
        name: "Cupid's Bow",
        scientificName: 'Labrale Superius',
        path: 'landmarksFront/cupidsBow',
        howToFind: 'Locate the highest point of the upper lip, typically to the right or left of center.',
    },
    innerCupidsBow: {
        description: "The inner dip of the cupid's bow at the center of the upper lip vermilion border.",
        name: "Inner Cupid's Bow",
        scientificName: "Cupid's Bow",
        path: "landmarksFront/innerCupidsBow",
        howToFind: "Mark the central dip between the two peaks of the cupid's bow, at the vermilion border of the upper lip."
    },
    mouthMiddle: {
        description: 'The center point of the mouth.',
        name: 'Mouth Middle',
        scientificName: 'Mouth Middle',
        path: 'landmarksFront/mouthMiddle',
        howToFind: 'Locate the center point of the mouth, where the upper and lower lips meet.',
    },
    lowerLip: {
        description: 'The center point of the lower lip at its fullest part.',
        name: 'Lower Lip Center',
        scientificName: 'Labrale Inferius',
        path: 'landmarksFront/lowerLip',
        howToFind: 'Mark the center of the lower lip at the most prominent or fullest part.',
    },
    leftTopGonion: {
        description: 'The upper angle point of the left jaw.',
        name: 'Left Upper Jaw Angle',
        scientificName: 'Left Gonion Superior',
        path: 'landmarksFront/leftTopGonion',
        howToFind:
            'Locate the upper part of the left jaw angle where it begins to curve, typically the most prominent point near mouth level.',
    },
    rightTopGonion: {
        description: 'The upper angle point of the right jaw.',
        name: 'Right Upper Jaw Angle',
        scientificName: 'Right Gonion Superior',
        path: 'landmarksFront/rightTopGonion',
        howToFind:
            'Locate the upper part of the right jaw angle where it begins to curve, typically the most prominent point near mouth level.',
    },
    leftBottomGonion: {
        description: 'The lower angle point of the left jaw.',
        name: 'Left Lower Jaw Angle',
        scientificName: 'Left Gonion Inferior',
        path: 'landmarksFront/leftBottomGonion',
        howToFind:
            'Locate the lower part of the left jaw angle below the upper angle, where the jaw curves toward the chin.',
    },
    rightBottomGonion: {
        description: 'The lower angle point of the right jaw.',
        name: 'Right Lower Jaw Angle',
        scientificName: 'Right Gonion Inferior',
        path: 'landmarksFront/rightBottomGonion',
        howToFind:
            'Locate the lower part of the right jaw angle below the upper angle, where the jaw curves toward the chin.',
    },
    chinLeft: {
        description: 'The left side point of the chin.',
        name: 'Left Chin',
        scientificName: 'Left Mentum Lateralis',
        path: 'landmarksFront/chinLeft',
        howToFind: 'Mark the left side of the chin, where the chin begins to curve and form an angle.',
    },
    chinRight: {
        description: 'The right side point of the chin.',
        name: 'Right Chin',
        scientificName: 'Right Mentum Lateralis',
        path: 'landmarksFront/chinRight',
        howToFind: 'Mark the right side of the chin, where the chin begins to curve and form an angle.',
    },
    chinBottom: {
        description: 'The lowest point of the chin.',
        name: 'Chin Bottom',
        scientificName: 'Menton',
        path: 'landmarksFront/chinBottom',
        howToFind: 'Locate the lowest point of the chin between the left and right chin points.',
    },
    neckLeft: {
        description: 'The left side of the neck at the jawline.',
        name: 'Left Neck Point',
        scientificName: 'Left Cervical Lateralis',
        path: 'landmarksFront/neckLeft',
        howToFind: 'Mark the widest point of the left side of the neck, typically right below the jawline.',
    },
    neckRight: {
        description: 'The right side of the neck at the jawline.',
        name: 'Right Neck Point',
        scientificName: 'Right Cervical Lateralis',
        path: 'landmarksFront/neckRight',
        howToFind: 'Mark the widest point of the right side of the neck, typically right below the jawline.',
    },
};

export const sideProfileLandmarks: LandmarkCollection = {
    vertex: {
        description: 'Highest point on the head in profile.',
        name: 'Top of Head',
        scientificName: 'Vertex',
        path: 'landmarksSide/vertex',
        howToFind:
            "Mark the highest point of the head's curve, typically around the middle of the upper head.",
    },
    occiput: {
        description: 'Back-of-head prominence.',
        name: 'Occiput',
        scientificName: 'External Occipital Region',
        path: 'landmarksSide/occiput',
        howToFind: "Mark the most prominent point on the back of the head's curve, typically above the ear.",
    },
    pronasale: {
        description: 'Most forward point of the nose tip.',
        name: 'Nose Tip',
        scientificName: 'Pronasale',
        path: 'landmarksSide/pronasale',
        howToFind: 'Mark the farthest projecting point of the nose tip.',
    },
    neckPoint: {
        description: 'Lower neck inflection on the front border.',
        name: 'Neck Point',
        scientificName: 'Anterior Cervical Landmark',
        path: 'landmarksSide/neckPoint',
        howToFind:
            "Follow the neck contour down to the Adam's apple and mark a point above the collar region.",
    },
    porion: {
        description: 'The upper margin of the ear canal opening, used for Frankfort horizontal plane.',
        name: 'Porion',
        scientificName: 'Porion (soft tissue)',
        path: 'landmarksSide/porion',
        howToFind:
            'Mark the uppermost point of the ear canal opening, right above the tragus (the small flap in front of the ear canal).',
    },
    orbitale: {
        description: 'Lowest point on the orbital rim.',
        name: 'Orbitale',
        scientificName: 'Orbitale',
        path: 'landmarksSide/orbitale',
        howToFind: 'Trace the undereye contour and mark the most prominent part of the orbital rim.',
    },
    eyelidEnd: {
        description: "The lateral end point of the visible eyelid in profile view.",
        name: "Eyelid End",
        scientificName: "Lateral Eyelid",
        path: "landmarksSide/eyelidEnd",
        howToFind: "From the side profile, mark the outermost visible point of the eyelid."
    },
    lowerEyelid: {
        description: "The lower eyelid margin as seen from the side profile.",
        name: "Lower Eyelid",
        scientificName: "Left Palpebra Inferior",
        path: "landmarksSide/lowerEyelid",
        howToFind: "From the side profile, locate the lower edge of the lower eyelid, typically the most prominent point of the lower lid margin."
    },
    tragus: {
        description: 'Cartilage nub in front of the ear canal.',
        name: 'Tragus',
        scientificName: 'Tragion (soft tissue)',
        path: 'landmarksSide/tragus',
        howToFind: 'Mark the back part of the small flap in front of the ear canal.',
    },
    intertragicNotch: {
        description:
            'The notch between the tragus and antitragus cartilages, marking the deepest depression in the anterior ear margin.',
        name: 'Intertragic Notch',
        scientificName: 'Incisura Intertragica',
        path: 'landmarksSide/intertragicNotch',
        howToFind:
            'Locate the small groove between the tragus (small flap in front of the ear canal) and the antitragus (small bump opposite to it). This is where the jawline construction begins.',
    },
    gonionTop: {
        description: 'Upper angle point of the jaw from side profile.',
        name: 'Upper Jaw Angle',
        scientificName: 'Gonion Superior',
        path: 'landmarksSide/gonionTop',
        howToFind:
            'Locate the upper part of the jaw angle where the ramus (back part of the jaw) forms an angle with the mandible (lower part of the jaw).',
    },
    gonionBottom: {
        description: 'Lower angle point of the jaw from side profile.',
        name: 'Lower Jaw Angle',
        scientificName: 'Gonion Inferior',
        path: 'landmarksSide/gonionBottom',
        howToFind:
            'Locate the lower part of the jaw angle that sits below the upper jaw angle, where the jaw begins to curve towards the chin.',
    },
    menton: {
        description: 'Lowest point on the soft-tissue chin.',
        name: 'Chin Bottom',
        scientificName: 'Menton (soft tissue)',
        path: 'landmarksSide/menton',
        howToFind:
            'Trace the chin contour downward and mark its lowest point. This should form an angle with the upper and lower jaw points, outlining the jawline shape.',
    },
    trichion: {
        description: 'Forehead hairline point.',
        name: 'Hairline (Profile)',
        scientificName: 'Trichion',
        path: 'landmarksSide/trichion',
        howToFind: 'Mark the highest point of the hairline, where the forehead ends.',
    },
    forehead: {
        description: "The most prominent point of the forehead between the hairline and brow ridge, where the forehead may begin to curve towards the hairline.",
        name: "Forehead",
        scientificName: "Frontalis",
        path: "landmarksSide/forehead",
        howToFind: "From the side profile, locate the most forward-projecting point of the forehead, typically between the hairline and the brow ridge."
    },
    glabella: {
        description: 'Mid-forehead point between brows.',
        name: 'Glabella',
        scientificName: 'Glabella',
        path: 'landmarksSide/glabella',
        howToFind:
            'Locate the most prominent point of the brow ridge between the eyebrows, above the indented part of the upper nose bridge.',
    },
    nasion: {
        description: 'Nasal root depression.',
        name: 'Nasal Bridge Root',
        scientificName: 'Nasion',
        path: 'landmarksSide/nasion',
        howToFind: 'Mark the small dip between the brow ridge and nose bridge, typically around eye level.',
    },
    rhinion: {
        description: 'Dorsal point of the nose.',
        name: 'Rhinion',
        scientificName: 'Rhinion',
        path: 'landmarksSide/rhinion',
        howToFind:
            'Mark the dorsal point of the nose, typically the most prominent point of the nose bridge around the middle.',
    },
    supratip: {
        description: 'Dorsal point just above the tip.',
        name: 'Supratip',
        scientificName: 'Supratip Break',
        path: 'landmarksSide/supratip',
        howToFind: 'Follow the bridge toward the tip and mark the highest point right before the nose tip.',
    },
    infratip: {
        description: 'The point between the nose tip and columella on the nasal profile.',
        name: 'Infratip',
        scientificName: 'Infratip Lobule',
        path: 'landmarksSide/infratip',
        howToFind: 'Follow the nose contour down from the tip and mark the lowest point before the nostrils.',
    },
    columella: {
        description: 'Inferior border of the nasal septum between nostrils.',
        name: 'Columella',
        scientificName: 'Columella Nasi',
        path: 'landmarksSide/columella',
        howToFind: 'Mark the part of the nose that connects the nostrils, to the left of the infratip.',
    },
    subnasale: {
        description: 'Where nose base meets upper lip.',
        name: 'Subnasale',
        scientificName: 'Subnasale',
        path: 'landmarksSide/subnasale',
        howToFind:
            'Mark the crease point at the base of the nose, where the nose creates an angle with the upper lip.',
    },
    subalare: {
        description: 'Lowest point of the nostril wing on the visible side.',
        name: 'Subalare',
        scientificName: 'Subalare',
        path: 'landmarksSide/subalare',
        howToFind:
            'Mark the most prominent edge of the nose wing, the part of the lower nose near the cheek closest to the eyes.',
    },
    labraleSuperius: {
        description: 'Most forward point of the upper lip vermilion.',
        name: 'Upper Lip',
        scientificName: 'Labrale Superius',
        path: 'landmarksSide/labraleSuperius',
        howToFind:
            "Find the most prominent point of the upper lip, typically the highest point of the lip's natural curve.",
    },
    cheilion: {
        description: 'Mouth corner where the lips meet.',
        name: 'Mouth Corner',
        scientificName: 'Cheilion',
        path: 'landmarksSide/cheilion',
        howToFind: 'Mark the rearmost lip corner where the upper and lower lips touch in profile.',
    },
    labraleInferius: {
        description: 'Most forward point of the lower lip vermilion.',
        name: 'Lower Lip',
        scientificName: 'Labrale Inferius',
        path: 'landmarksSide/labraleInferius',
        howToFind:
            "Find the most prominent point of the lower lip, typically the lowest point of the lip's natural curve.",
    },
    sublabiale: {
        description: 'Deepest point of the crease between lower lip and chin.',
        name: 'Labiomental Fold',
        scientificName: 'Sublabiale',
        path: 'landmarksSide/sublabiale',
        howToFind: 'From profile, mark the deepest spot between the lower lip and chin.',
    },
    pogonion: {
        description: 'Most forward point on the soft-tissue chin.',
        name: 'Chin Point',
        scientificName: 'Pogonion (soft tissue)',
        path: 'landmarksSide/pogonion',
        howToFind: 'Mark the most prominent and forward point of the chin.',
    },
    cervicalPoint: {
        description: 'High neck point just under the jaw.',
        name: 'Cervical Point',
        scientificName: 'Cervicale (soft-tissue reference)',
        path: 'landmarksSide/cervicalPoint',
        howToFind: 'Mark the most indented point where the underside of the jaw turns into the neck.',
    },
    cheekbone: {
        description: 'Zygomatic prominence.',
        name: 'Cheekbone',
        scientificName: 'Zygion (soft-tissue over zygoma)',
        path: 'landmarksSide/cheekbone',
        howToFind: 'From the side, mark the bump of the cheekbone just below/behind the eye.',
    },
    cornealApex: {
        description: 'Most forward point of the eye (cornea).',
        name: 'Corneal Apex',
        scientificName: 'Corneal Apex',
        path: 'landmarksSide/cornealApex',
        howToFind: 'Mark the most prominent and forward point of the eye.',
    },
};

export type ProfileType = 'front' | 'side';
export type Gender = 'male' | 'female';
export type Race =
    | 'asian'
    | 'black'
    | 'white'
    | 'hispanic'
    | 'native-american'
    | 'south-asian'
    | 'middle-eastern'
    | 'pacific-islander';

export const getAllLandmarks = (profileType: ProfileType): LandmarkCollection => {
    if (profileType === 'front') {
        return frontProfileLandmarks;
    } else if (profileType === 'side') {
        return sideProfileLandmarks;
    }
    return {};
};

/**
 * Get list of all front profile landmark keys
 */
export const getFrontLandmarkKeys = (): string[] => {
    return Object.keys(frontProfileLandmarks);
};

/**
 * Get list of all side profile landmark keys  
 */
export const getSideLandmarkKeys = (): string[] => {
    return Object.keys(sideProfileLandmarks);
};
