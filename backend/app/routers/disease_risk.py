from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.animal import Animal
from app.models.farm import Farm
from app.models.user import User
from app.core.dependencies import get_current_user

from app.services.animal_intelligence import (
    analyze_animal_intelligence,
)

from app.services.disease_prediction import (
    predict_animal_health_risks,
)


router = APIRouter(
    prefix="/api/v1/disease-risk",
    tags=["Disease Risk"],
)


@router.get("/")
def get_farm_disease_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate explainable operational health-risk
    predictions for all animals owned by the user.

    This endpoint does not diagnose disease.
    """

    animals = (
        db.query(Animal)
        .join(
            Farm,
            Animal.farm_id == Farm.id,
        )
        .filter(
            Farm.owner_id == current_user.id,
        )
        .order_by(
            Animal.id.asc()
        )
        .all()
    )

    results = []

    for animal in animals:

        try:

            intelligence = (
                analyze_animal_intelligence(
                    animal=animal,
                    db=db,
                )
            )

            prediction = (
                predict_animal_health_risks(
                    intelligence
                )
            )

            results.append(
                {
                    "animal_id": animal.id,
                    "animal_name": animal.name,
                    "prediction": prediction,
                }
            )

        except Exception as error:

            print(
                f"Disease risk error "
                f"for animal {animal.id}: {error}"
            )

            results.append(
                {
                    "animal_id": animal.id,
                    "animal_name": animal.name,
                    "prediction": None,
                    "error": (
                        "Prediction unavailable"
                    ),
                }
            )

    return {
        "summary": {
            "total_animals": len(results),
            "critical": sum(
                1
                for item in results
                if str(
                    (
                        item.get("prediction")
                        or {}
                    ).get(
                        "risk_level",
                        "",
                    )
                ).lower()
                == "critical"
            ),
            "elevated": sum(
                1
                for item in results
                if str(
                    (
                        item.get("prediction")
                        or {}
                    ).get(
                        "risk_level",
                        "",
                    )
                ).lower()
                in {"elevated", "high"}
            ),
            "moderate": sum(
                1
                for item in results
                if str(
                    (
                        item.get("prediction")
                        or {}
                    ).get(
                        "risk_level",
                        "",
                    )
                ).lower()
                == "moderate"
            ),
        },

        "animals": results,

        "engine": {
            "name": (
                "HerdSense AI Disease Risk Engine"
            ),
            "version": "1.0.0",
            "mode": "deterministic",
            "diagnosis": False,
        },
    }