from fastapi import APIRouter, Depends, HTTPException, status
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
    prefix="/api/v1/intelligence",
    tags=["Animal Intelligence"],
)


# =============================================================================
# HELPERS
# =============================================================================

def get_owned_animal(
    animal_id: int,
    db: Session,
    current_user: User,
) -> Animal:
    """
    Resolve an animal belonging to a farm owned by
    the authenticated user.
    """

    animal = (
        db.query(Animal)
        .join(
            Farm,
            Animal.farm_id == Farm.id,
        )
        .filter(
            Animal.id == animal_id,
            Farm.owner_id == current_user.id,
        )
        .first()
    )

    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found",
        )

    return animal


def get_owned_animals(
    db: Session,
    current_user: User,
):
    """
    Return all animals belonging to farms owned
    by the authenticated user.
    """

    return (
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


# =============================================================================
# ANIMAL INTELLIGENCE
# =============================================================================

@router.get(
    "/animal/{animal_id}",
    status_code=status.HTTP_200_OK,
)
def get_animal_intelligence(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return the complete intelligence profile for one
    monitored animal.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:
        intelligence = analyze_animal_intelligence(
            animal=animal,
            db=db,
        )

        if intelligence is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(
                    "Animal intelligence service returned "
                    "an empty result."
                ),
            )

        return intelligence

    except HTTPException:
        raise

    except Exception as error:

        db.rollback()

        print(
            f"Animal intelligence analysis error "
            f"for animal {animal_id}: {error}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to generate animal intelligence "
                "at this time."
            ),
        )


# =============================================================================
# ANIMAL INTELLIGENCE STATUS
# =============================================================================

@router.get(
    "/animal/{animal_id}/status",
    status_code=status.HTTP_200_OK,
)
def get_animal_intelligence_status(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return lightweight monitoring state for an animal.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    return {
        "animal_id": animal.id,
        "animal_name": animal.name,
        "health_status": getattr(
            animal,
            "health_status",
            None,
        ),
        "monitoring_status": (
            "active"
            if getattr(
                animal,
                "is_active",
                True,
            )
            else "inactive"
        ),
    }


# =============================================================================
# FARM INTELLIGENCE
# =============================================================================

@router.get(
    "/farm",
    status_code=status.HTTP_200_OK,
)
def get_farm_intelligence(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return production intelligence for every animal
    belonging to farms owned by the authenticated user.
    """

    animals = get_owned_animals(
        db=db,
        current_user=current_user,
    )

    results = []

    for animal in animals:

        try:

            intelligence = analyze_animal_intelligence(
                animal=animal,
                db=db,
            )

            if intelligence:
                results.append(
                    intelligence
                )

        except Exception as error:

            print(
                f"Farm intelligence error "
                f"for animal {animal.id}: {error}"
            )

    animals_with_data = [
        item
        for item in results
        if item.get("health_score") is not None
    ]

    critical_animals = sum(
        item.get("risk_level") == "critical"
        for item in results
    )

    elevated_animals = sum(
        item.get("risk_level") == "elevated"
        for item in results
    )

    moderate_animals = sum(
        item.get("risk_level") == "moderate"
        for item in results
    )

    healthy_animals = sum(
        item.get("health_status") == "Healthy"
        for item in results
    )

    unknown_animals = sum(
        item.get("risk_level") == "unknown"
        for item in results
    )

    average_health_score = None

    if animals_with_data:

        average_health_score = round(
            sum(
                item["health_score"]
                for item in animals_with_data
            )
            / len(animals_with_data),
            1,
        )

    if critical_animals > 0:

        farm_risk_level = "critical"

    elif elevated_animals > 0:

        farm_risk_level = "elevated"

    elif moderate_animals > 0:

        farm_risk_level = "moderate"

    elif unknown_animals > 0:

        farm_risk_level = "unknown"

    else:

        farm_risk_level = "low"

    return {
        "summary": {
            "total_animals": len(results),
            "animals_with_telemetry": len(
                animals_with_data
            ),
            "healthy": healthy_animals,
            "critical": critical_animals,
            "elevated": elevated_animals,
            "moderate": moderate_animals,
            "unknown": unknown_animals,
            "average_health_score": average_health_score,
            "farm_risk_level": farm_risk_level,
        },

        "animals": results,

        "engine": {
            "name": (
                "HerdSense AI Animal Intelligence Engine"
            ),
            "version": "3.0.0",
            "mode": "deterministic",
            "diagnosis": False,
        },
    }


# =============================================================================
# FARM DISEASE-RISK PREDICTION
# =============================================================================

@router.get(
    "/../disease-risk/",
    status_code=status.HTTP_200_OK,
)
def get_farm_disease_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return explainable operational health-risk predictions
    for all monitored animals owned by the authenticated user.

    This endpoint does NOT diagnose disease.
    """

    animals = get_owned_animals(
        db=db,
        current_user=current_user,
    )

    predictions = []

    for animal in animals:

        try:

            intelligence = analyze_animal_intelligence(
                animal=animal,
                db=db,
            )

            prediction = predict_animal_health_risks(
                intelligence
            )

            predictions.append(
                {
                    "animal_id": animal.id,
                    "animal_name": animal.name,
                    "prediction": prediction,
                }
            )

        except Exception as error:

            print(
                f"Disease-risk prediction error "
                f"for animal {animal.id}: {error}"
            )

            predictions.append(
                {
                    "animal_id": animal.id,
                    "animal_name": animal.name,
                    "prediction": None,
                    "error": (
                        "Unable to generate prediction."
                    ),
                }
            )

    critical = 0
    elevated = 0
    moderate = 0
    low = 0
    unknown = 0

    for item in predictions:

        prediction = item.get(
            "prediction"
        ) or {}

        risk_level = str(
            prediction.get(
                "risk_level",
                "unknown",
            )
        ).lower()

        if risk_level == "critical":
            critical += 1

        elif risk_level in {
            "elevated",
            "high",
        }:
            elevated += 1

        elif risk_level == "moderate":
            moderate += 1

        elif risk_level in {
            "low",
            "healthy",
        }:
            low += 1

        else:
            unknown += 1

    return {
        "summary": {
            "total_animals": len(
                predictions
            ),
            "critical": critical,
            "elevated": elevated,
            "moderate": moderate,
            "low": low,
            "unknown": unknown,
        },

        "animals": predictions,

        "engine": {
            "name": (
                "HerdSense AI Disease Risk Engine"
            ),
            "mode": "deterministic",
            "diagnosis": False,
        },
    }


# =============================================================================
# INDIVIDUAL DISEASE-RISK PREDICTION
# =============================================================================

@router.get(
    "/animal/{animal_id}/disease-risk",
    status_code=status.HTTP_200_OK,
)
def get_animal_disease_risk(
    animal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate explainable operational health-risk
    predictions for one monitored animal.

    IMPORTANT:
    This endpoint does not diagnose disease.
    """

    animal = get_owned_animal(
        animal_id=animal_id,
        db=db,
        current_user=current_user,
    )

    try:

        intelligence = analyze_animal_intelligence(
            animal=animal,
            db=db,
        )

        prediction = predict_animal_health_risks(
            intelligence
        )

        return {
            "animal_id": animal.id,
            "animal_name": animal.name,
            "prediction": prediction,
        }

    except HTTPException:
        raise

    except Exception as error:

        db.rollback()

        print(
            f"Disease-risk prediction error "
            f"for animal {animal_id}: {error}"
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to generate disease-risk "
                "prediction at this time."
            ),
        )