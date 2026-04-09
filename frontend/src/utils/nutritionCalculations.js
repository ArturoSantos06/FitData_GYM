const ACTIVITY_FACTORS = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  atleta: 1.9
};

const GOAL_SETTINGS = {
  perder_grasa: {
    calorieAdjustment: -0.15,
    proteinPerKg: 2.0,
    fatPerKg: 0.8
  },
  mantener: {
    calorieAdjustment: 0,
    proteinPerKg: 1.8,
    fatPerKg: 1.0
  },
  ganar_musculo: {
    calorieAdjustment: 0.1,
    proteinPerKg: 2.2,
    fatPerKg: 0.9
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateBMR({ sex, weightKg, heightCm, age }) {
  const sexKey = String(sex || '').toLowerCase();

  if (sexKey === 'hombre') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  if (sexKey === 'mujer') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
}

export function calculateMacroTargets(input) {
  const {
    sex,
    age,
    weightKg,
    heightCm,
    activityLevel,
    goal
  } = input;

  const parsedAge = Number(age);
  const parsedWeight = Number(weightKg);
  const parsedHeight = Number(heightCm);

  if (!parsedAge || !parsedWeight || !parsedHeight) {
    throw new Error('Edad, peso y altura son obligatorios');
  }

  const sanitizedAge = clamp(parsedAge, 10, 100);
  const sanitizedWeight = clamp(parsedWeight, 30, 250);
  const sanitizedHeight = clamp(parsedHeight, 120, 240);

  const activityFactor = ACTIVITY_FACTORS[activityLevel] || ACTIVITY_FACTORS.moderado;
  const goalConfig = GOAL_SETTINGS[goal] || GOAL_SETTINGS.mantener;

  const bmr = calculateBMR({
    sex,
    weightKg: sanitizedWeight,
    heightCm: sanitizedHeight,
    age: sanitizedAge
  });

  const maintenanceCalories = bmr * activityFactor;
  const targetCalories = maintenanceCalories * (1 + goalConfig.calorieAdjustment);

  const proteinGrams = sanitizedWeight * goalConfig.proteinPerKg;
  const fatGrams = sanitizedWeight * goalConfig.fatPerKg;

  const proteinCalories = proteinGrams * 4;
  const fatCalories = fatGrams * 9;
  const remainingCalories = Math.max(targetCalories - proteinCalories - fatCalories, 0);
  const carbGrams = remainingCalories / 4;

  return {
    kcal: Math.round(targetCalories),
    bmr: Math.round(bmr),
    maintenanceKcal: Math.round(maintenanceCalories),
    proteinGrams: Math.round(proteinGrams),
    fatGrams: Math.round(fatGrams),
    carbGrams: Math.round(carbGrams),
    split: {
      proteinPercent: Math.round(((proteinCalories / targetCalories) || 0) * 100),
      fatPercent: Math.round(((fatCalories / targetCalories) || 0) * 100),
      carbsPercent: Math.round(((remainingCalories / targetCalories) || 0) * 100)
    }
  };
}

export const nutritionFormulaInfo = {
  formula: 'Mifflin-St Jeor + ajuste por actividad y objetivo',
  activityFactors: ACTIVITY_FACTORS,
  goals: GOAL_SETTINGS
};
