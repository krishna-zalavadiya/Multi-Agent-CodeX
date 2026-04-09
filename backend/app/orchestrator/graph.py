import asyncio
from app.database import get_session
from app.models import Review, ReviewStatus, Finding, FindingCategory
from app.agents.bug_agent import run_bug_detector
from app.agents.security_agent import run_security_analyst
from app.agents.perf_agent import run_optimization_advisor

async def run_review_pipeline(review_id: str, code: str, language: str):
    async with get_session() as db:
        review = await db.get(Review, review_id)
        if not review: return
        
        review.status = ReviewStatus.RUNNING
        await db.commit()

        try:
            # Parallel Fan-out
            results = await asyncio.gather(
                run_bug_detector(code, language),
                run_security_analyst(code, language),
                run_optimization_advisor(code, language)
            )

            # Flatten and Save
            all_findings = []
            categories = [FindingCategory.BUG, FindingCategory.SECURITY, FindingCategory.PERFORMANCE]
            
            for i, result in enumerate(results):
                for f in result.get("findings", []):
                    new_f = Finding(
                        review_id=review.id,
                        category=categories[i],
                        severity=f.get("severity", "low"),
                        title=f.get("message", "Issue found"),
                        description=f.get("message"),
                        suggestion=f.get("suggestion"),
                        line_number=f.get("line")
                    )
                    db.add(new_f)
                    all_findings.append(new_f)

            review.status = ReviewStatus.DONE
            review.total_findings_count = len(all_findings)
            await db.commit()

        except Exception as e:
            review.status = ReviewStatus.ERROR
            await db.commit()