from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExerciseCreate(BaseModel):
    name: str = Field(min_length = 1, max_length = 30)
    type: str
    part: str

class SetCreate(BaseModel):
    weight: float = Field(ge = 0)
    reps: int = Field(gt = 0)

class WorkoutCreate(BaseModel):
    exercise_id: int
    date: str
    sets: list[SetCreate]

@app.get("/")
def home():
    return {"message": "Welcome to WeightLog"}

exercises = []
workouts = []
result = []

next_id = 1
next_workout_id = 1

@app.post("/exercises")
def create_exercises(exercise: ExerciseCreate):
    global next_id

    for item in exercises:
        if item["name"] == exercise.name:
            raise HTTPException(
                status_code = 409,
                detail = "이미 등록된 운동입니다."
            )

    new_exercise = exercise.model_dump()
    new_exercise["id"] = next_id

    exercises.append(new_exercise)
    next_id += 1

    return new_exercise

@app.post("/workouts")
def create_workout(workout: WorkoutCreate):
    global next_workout_id
    found = False

    for item in exercises:
        if item["id"] == workout.exercise_id:
            found = True
            break

    if not found:
        raise HTTPException(
            status_code = 404,
            detail = "해당 운동을 찾을 수 없습니다."
        )

    new_workout = workout.model_dump()
    new_workout["id"] = next_workout_id

    workouts.append(new_workout)
    next_workout_id += 1

    return new_workout

@app.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: int):
    for item in exercises:
        if item["id"] == exercise_id:
            return item

    raise HTTPException(
        status_code = 404,
        detail = "해당 운동을 찾을 수 없습니다."
    )

@app.get("/exercises")
def get_exercises():
    return exercises

@app.get("/workouts/{workout_id}")
def get_workout(workout_id: int):
    for item in workouts:
        if item["id"] == workout_id:
            return item

    raise HTTPException(
        status_code = 404,
        detail = "해당 기록을 찾을 수 없습니다."
    )

@app.get("/workouts")
def get_workouts(exercise_id: int | None = None):
    if exercise_id is None:
        return workouts
    
    result = []

    for item in workouts:
        if item["exercise_id"] == exercise_id:
            result.append(item)
            
    return result

@app.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int):
    for item in exercises:
        if item["id"] ==exercise_id:
            exercises.remove(item)
            return {"message": "운동 삭제 완료"}
        
    raise HTTPException(
        status_code=404,
        detail="해당 운동을 찾을 수 없습니다."
    )
        
